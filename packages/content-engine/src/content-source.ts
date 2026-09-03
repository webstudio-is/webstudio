import {
  createContentCompilationPlan,
  requiresStructuredProperties,
  selectContentHydrationCandidates,
  type ContentCompilationPlan,
} from "./compilation-plan";
import {
  compileContentArtifact,
  type ContentCompilerDiagnostics,
  type ContentCompilerInput,
} from "./asset-index";
import type { AssetQueryDiagnosticIssue, ContentArtifactV1 } from "./schema";
import { discoverMarkdownAssetReferenceRanges } from "./markdown-assets";
import { createUniqueAssetIdsByPath } from "./asset-path-resolution";
import type { MarkdownAssetReferences } from "./markdown-references";
import {
  discoverAssetValueReferences,
  type AssetValueReferences,
} from "./asset-value-references";
import { compareStrings } from "./canonical-json";
import {
  decodeUtf8,
  encodeUtf8,
  readBoundedBytes,
  type ByteSource,
} from "./byte-stream";
import { extractMarkdownBody } from "./markdown-body";
import { contentEngineLimits } from "./limits";
import {
  discoverMdxBodyAssetReferences,
  validateTextAssetSource,
  type MdxDocument,
} from "./mdx";
import {
  compileDocumentSourceGraph,
  createDocumentSourceUrl,
  getDocumentFormatByContentType,
  type SourceReferenceOccurrence,
  type DocumentGraph,
} from "./document-graph";

export type ContentSourceFile = {
  id: string;
  path: string;
  contentType: string;
  contentRef: string;
  revision: string;
  size: number;
  createdAt?: string;
};

export interface ContentSourceSnapshot {
  readonly revision: string;
  readonly files: readonly ContentSourceFile[];
  loadEntries(
    plan?: ContentCompilationPlan,
    options?: { maximumContentBytes: number }
  ): Promise<readonly ContentCompilerInput[]>;
  loadDocumentSources?(): Promise<readonly ContentSourceDocument[]>;
  isCurrent(): Promise<boolean>;
}

export type ContentSourceDocument = Readonly<{
  id: string;
  source: ByteSource;
}>;

const isDocumentFile = ({ contentType }: ContentSourceFile) =>
  getDocumentFormatByContentType(contentType) !== undefined;

export interface ContentSource {
  openSnapshot(): Promise<ContentSourceSnapshot>;
}

export type ContentSourcePerformancePhase =
  | "document-graph"
  | "asset-references"
  | "source-validation";

export type ContentSourcePerformanceObserver = (event: {
  type: "phase-completed";
  phase: ContentSourcePerformancePhase;
  durationMs: number;
}) => void;

const measureContentSourcePerformance = async <Value>({
  phase,
  operation,
  observer,
  now,
}: {
  phase: ContentSourcePerformancePhase;
  operation: () => Promise<Value> | Value;
  observer?: ContentSourcePerformanceObserver;
  now: () => number;
}) => {
  const startedAt = now();
  try {
    return await operation();
  } finally {
    try {
      observer?.({
        type: "phase-completed",
        phase,
        durationMs: Math.max(0, now() - startedAt),
      });
    } catch {
      // Observability must not change compilation behavior.
    }
  }
};

export const createContentSourceFile = ({
  assetId,
  revision,
  document,
}: ContentCompilerInput): ContentSourceFile => ({
  id: assetId,
  path: document.path,
  contentType: document.mimeType,
  contentRef: document.contentRef,
  revision,
  size: document.size,
  createdAt: document.createdAt,
});

export class ContentSourceChangedError extends Error {
  constructor() {
    super("Content source changed while the database was being compiled");
    this.name = "ContentSourceChangedError";
  }
}

type SourceIssue = NonNullable<
  ContentCompilerDiagnostics["sourceIssues"]
>[number];
type DocumentSourceDiagnostic = SourceIssue &
  Partial<Pick<AssetQueryDiagnosticIssue, "scope" | "phase">>;

export class DocumentSourceDiagnosticsError extends Error {
  readonly diagnostics: readonly DocumentSourceDiagnostic[];
  readonly scope: "query" | "database";

  constructor(
    diagnostics: readonly DocumentSourceDiagnostic[],
    scope: "query" | "database" = "query"
  ) {
    const errorCount = diagnostics.filter(
      ({ severity }) => severity === "error"
    ).length;
    super(
      `${errorCount} document source ${
        errorCount === 1 ? "error" : "errors"
      } found`
    );
    this.name = "DocumentSourceDiagnosticsError";
    this.diagnostics = diagnostics;
    this.scope = scope;
  }
}

const validateSnapshot = (snapshot: ContentSourceSnapshot) => {
  if (snapshot.revision.length === 0) {
    throw new Error("Content source snapshot revision cannot be empty");
  }
  const ids = new Set<string>();
  for (const file of snapshot.files) {
    if (file.id.length === 0 || ids.has(file.id)) {
      throw new Error("Content source snapshot file ids must be unique");
    }
    ids.add(file.id);
    if (
      file.path.length === 0 ||
      file.contentType.length === 0 ||
      file.contentRef.length === 0 ||
      file.revision.length === 0 ||
      Number.isSafeInteger(file.size) === false ||
      file.size < 0
    ) {
      throw new Error("Content source snapshot contains an invalid file");
    }
  }
};

const validateEntries = ({
  snapshot,
  entries,
}: {
  snapshot: ContentSourceSnapshot;
  entries: readonly ContentCompilerInput[];
}) => {
  const fileById = new Map(snapshot.files.map((file) => [file.id, file]));
  for (const entry of entries) {
    const file = fileById.get(entry.assetId);
    if (
      file === undefined ||
      entry.revision !== file.revision ||
      entry.document.path !== file.path ||
      entry.document.mimeType !== file.contentType ||
      entry.document.contentRef !== file.contentRef ||
      entry.document.size !== file.size ||
      entry.document.createdAt !== file.createdAt
    ) {
      throw new Error(
        "Content source returned an entry outside the captured snapshot"
      );
    }
  }
};

const discoverSnapshotAssetReferences = async ({
  snapshot,
  entries,
  plan,
}: {
  snapshot: ContentSourceSnapshot;
  entries: readonly ContentCompilerInput[];
  plan?: ContentCompilationPlan;
}): Promise<MarkdownAssetReferences> => {
  const assetIdsByPath = createUniqueAssetIdsByPath(snapshot.files);
  const selectedAssetIds =
    plan === undefined
      ? undefined
      : selectContentHydrationCandidates({
          documents: entries.map(({ document }) => document),
          plan: {
            ...plan,
            queries: plan.queries.filter(
              ({ content }) => content.mode === "markdown-body-ref"
            ),
          },
        });
  const references: Record<string, MarkdownAssetReferences[string]> = {};
  for (const entry of [...entries].sort((left, right) =>
    compareStrings(left.document.contentRef, right.document.contentRef)
  )) {
    if (
      entry.content === undefined ||
      entry.document.extension !== "md" ||
      selectedAssetIds?.has(entry.assetId) === false
    ) {
      continue;
    }
    const bytes = encodeUtf8(entry.content);
    const markdown =
      bytes.byteLength === 0
        ? ""
        : (await extractMarkdownBody(bytes, bytes.byteLength)).body;
    const discovered = discoverMarkdownAssetReferenceRanges({
      markdown,
      sourcePath: entry.document.path,
      assetIdsByPath,
    });
    if (discovered.length > 0) {
      references[entry.document.contentRef] = discovered;
    }
  }
  return references;
};

const validateSnapshotDocumentSources = async (
  entries: readonly ContentCompilerInput[]
): Promise<{
  sourceIssues: readonly SourceIssue[];
  mdxDocuments: ReadonlyMap<string, MdxDocument>;
}> => {
  const sourceIssues: SourceIssue[] = [];
  const mdxDocuments = new Map<string, MdxDocument>();
  for (const entry of entries) {
    const format = getDocumentFormatByContentType(entry.document.mimeType);
    if (
      entry.contentRequired &&
      entry.content === undefined &&
      (format === "markdown" || format === "mdx")
    ) {
      sourceIssues.push({
        severity: "warning",
        code: "SOURCE_VALIDATION_UNAVAILABLE",
        message: "File content could not be validated within the query limits",
        assetId: entry.assetId,
        path: entry.document.path,
      });
    }
    if (
      entry.content === undefined ||
      (format !== "markdown" && format !== "mdx")
    ) {
      continue;
    }
    const validation = await validateTextAssetSource({
      source: entry.content,
      format: format === "markdown" ? "md" : "mdx",
    });
    sourceIssues.push(
      ...validation.diagnostics.map((diagnostic) => ({
        severity: diagnostic.severity,
        code: diagnostic.code,
        message: diagnostic.message,
        assetId: entry.assetId,
        path: entry.document.path,
        ...("sourceRange" in diagnostic && diagnostic.sourceRange !== undefined
          ? {
              line: diagnostic.sourceRange.start.line,
              column: diagnostic.sourceRange.start.column,
            }
          : "line" in diagnostic && diagnostic.line !== undefined
            ? {
                line: diagnostic.line,
                ...(diagnostic.column === undefined
                  ? {}
                  : { column: diagnostic.column }),
              }
            : {}),
      }))
    );
    if (
      validation.format === "mdx" &&
      validation.recovery.status === "parsed"
    ) {
      mdxDocuments.set(entry.assetId, validation.recovery.document);
    }
  }
  if (sourceIssues.some(({ severity }) => severity === "error")) {
    throw new DocumentSourceDiagnosticsError(sourceIssues);
  }
  return { sourceIssues, mdxDocuments };
};

const discoverSnapshotAssetValueReferences = async ({
  snapshot,
  entries,
  analyzedProperties,
  validation,
}: {
  snapshot: ContentSourceSnapshot;
  entries: readonly ContentCompilerInput[];
  analyzedProperties: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  validation: Awaited<ReturnType<typeof validateSnapshotDocumentSources>>;
}): Promise<{
  references: AssetValueReferences;
  sourceIssues: readonly SourceIssue[];
}> => {
  const assetIdsByPath = createUniqueAssetIdsByPath(snapshot.files);
  const structuredAssetIds = new Set(
    snapshot.files
      .filter((file) => isDocumentFile(file) === false)
      .map(({ id }) => id)
  );
  const references: AssetValueReferences = {};
  const discoverProperties = ({
    path,
    properties,
  }: {
    path: string;
    properties: Readonly<Record<string, unknown>>;
  }) => {
    return discoverAssetValueReferences({
      properties,
      sourcePath: path,
      assetIdsByPath,
      structuredAssetIds,
    });
  };
  for (const entry of [...entries].sort((left, right) =>
    compareStrings(left.assetId, right.assetId)
  )) {
    const discovered = discoverProperties({
      path: entry.document.path,
      properties: entry.document.properties ?? {},
    });
    const mdxDocument = validation.mdxDocuments.get(entry.assetId);
    if (mdxDocument !== undefined) {
      discovered.push(
        ...discoverMdxBodyAssetReferences({
          document: mdxDocument,
          sourcePath: entry.document.path,
          assetIdsByPath,
        })
      );
    }
    if (discovered.length > 0) {
      references[entry.assetId] = discovered;
    }
  }
  const entryIds = new Set(entries.map(({ assetId }) => assetId));
  const filesById = new Map(snapshot.files.map((file) => [file.id, file]));
  for (const [id, properties] of analyzedProperties) {
    if (entryIds.has(id)) {
      continue;
    }
    const file = filesById.get(id);
    if (file !== undefined) {
      const discovered = discoverProperties({
        path: file.path,
        properties,
      });
      if (discovered.length > 0) {
        references[id] = discovered;
      }
    }
  }
  return { references, sourceIssues: validation.sourceIssues };
};

const queryNeedsDocumentGraph = (
  query: ContentCompilationPlan["queries"][number]
) => {
  if (
    query.limit.type === "literal" &&
    typeof query.limit.value === "number" &&
    query.limit.value <= 0
  ) {
    return false;
  }
  if (query.content.mode === "markdown-body-ref") {
    return true;
  }
  const queryPlan = createContentCompilationPlan([query]);
  return queryPlan !== undefined && requiresStructuredProperties(queryPlan);
};

const planReferencesMarkdownBodies = (plan?: ContentCompilationPlan) =>
  plan?.queries.some(({ content }) => content.mode === "markdown-body-ref") ===
  true;

type AssetReferenceIssue = NonNullable<
  ContentCompilerDiagnostics["assetReferenceIssues"]
>[number];

const documentPathExtensions = new Set(["json", "md", "markdown", "mdx"]);

const isMissingLocalAssetReference = ({
  occurrence,
  documentUrls,
}: {
  occurrence: SourceReferenceOccurrence;
  documentUrls: ReadonlySet<string>;
}) => {
  const url = new URL(occurrence.reference.documentUrl);
  if (
    url.origin !== new URL(createDocumentSourceUrl("")).origin ||
    documentUrls.has(url.href)
  ) {
    return false;
  }
  const filename = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    return false;
  }
  return documentPathExtensions.has(filename.slice(dotIndex + 1).toLowerCase())
    ? false
    : true;
};

const discoverSnapshotDocumentGraph = async (
  snapshot: ContentSourceSnapshot,
  entries: readonly ContentCompilerInput[],
  analyzedProperties: Map<string, Readonly<Record<string, unknown>>>,
  plan?: ContentCompilationPlan
): Promise<
  | Readonly<{
      graph?: DocumentGraph;
      contents?: Readonly<Record<string, string>>;
      assetReferenceIssues: readonly AssetReferenceIssue[];
    }>
  | undefined
> => {
  if (
    snapshot.loadDocumentSources === undefined ||
    (plan !== undefined && plan.queries.some(queryNeedsDocumentGraph) === false)
  ) {
    return;
  }
  const sourceDocuments = await snapshot.loadDocumentSources();
  const filesById = new Map(snapshot.files.map((file) => [file.id, file]));
  const sourcesById = new Map<string, ByteSource>();
  for (const document of sourceDocuments) {
    if (sourcesById.has(document.id)) {
      throw new Error("Content source returned duplicate document sources");
    }
    const file = filesById.get(document.id);
    if (
      file === undefined ||
      getDocumentFormatByContentType(file.contentType) === undefined
    ) {
      throw new Error("Content source returned an unsupported document source");
    }
    sourcesById.set(document.id, document.source);
  }
  const bytesById = new Map<string, Promise<Uint8Array>>();
  const getBytes = (id: string) => {
    let bytes = bytesById.get(id);
    if (bytes === undefined) {
      const source = sourcesById.get(id);
      if (source === undefined) {
        throw new Error("Content source document catalog is incomplete");
      }
      bytes = readBoundedBytes(source, contentEngineLimits.hydratedFileBytes);
      bytesById.set(id, bytes);
    }
    return bytes;
  };
  const supportedFiles = snapshot.files.filter(isDocumentFile);
  const documentUrls = new Set(
    supportedFiles.map((file) => createDocumentSourceUrl(file.path))
  );
  const assetReferenceIssues: AssetReferenceIssue[] = [];
  const ignoredReferenceUrls = new Set(
    snapshot.files
      .filter((file) => isDocumentFile(file) === false)
      .map((file) => createDocumentSourceUrl(file.path))
  );
  if (supportedFiles.some((file) => sourcesById.has(file.id) === false)) {
    throw new Error("Content source omitted a supported document source");
  }
  const graph = await compileDocumentSourceGraph({
    documents: supportedFiles.map((file) => {
      const format = getDocumentFormatByContentType(file.contentType);
      const source = sourcesById.get(file.id);
      if (format === undefined || source === undefined) {
        throw new Error("Content source document catalog is incomplete");
      }
      return {
        id: file.id,
        documentUrl: createDocumentSourceUrl(file.path),
        revision: file.revision,
        contentRef: file.contentRef,
        format,
        source: {
          async *[Symbol.asyncIterator]() {
            yield await getBytes(file.id);
          },
        },
      };
    }),
    ignoredReferenceUrls,
    ignoreReference: (occurrence) => {
      if (
        isMissingLocalAssetReference({ occurrence, documentUrls }) === false
      ) {
        return false;
      }
      assetReferenceIssues.push({
        code: "ASSET_NOT_FOUND",
        sourceDocumentId: occurrence.sourceDocumentId,
        referenceId: occurrence.referenceId,
        assetUrl: occurrence.reference.documentUrl,
      });
      return true;
    },
    onDocumentProperties: ({ id, properties }) => {
      analyzedProperties.set(id, properties);
    },
    ...(plan === undefined
      ? {}
      : {
          rootIds: entries.flatMap(({ assetId }) =>
            sourcesById.has(assetId) ? [assetId] : []
          ),
        }),
  });
  if (
    graph.edges.length === 0 &&
    planReferencesMarkdownBodies(plan) === false
  ) {
    return assetReferenceIssues.length === 0
      ? undefined
      : { assetReferenceIssues };
  }
  const contents = Object.fromEntries(
    await Promise.all(
      graph.nodes.map(async (node) => [
        node.contentRef,
        decodeUtf8(await getBytes(node.id)),
      ])
    )
  );
  return { graph, contents, assetReferenceIssues };
};

export const materializeContentSnapshot = async ({
  snapshot,
  plan,
  maximumContentBytes = contentEngineLimits.databaseBytes,
  onPerformanceEvent,
  performanceNow = () => performance.now(),
}: {
  snapshot: ContentSourceSnapshot;
  plan?: ContentCompilationPlan;
  maximumContentBytes?: number;
  onPerformanceEvent?: ContentSourcePerformanceObserver;
  performanceNow?: () => number;
}) => {
  validateSnapshot(snapshot);
  try {
    const entries = await snapshot.loadEntries(plan, { maximumContentBytes });
    validateEntries({ snapshot, entries });
    const analyzedProperties = new Map<
      string,
      Readonly<Record<string, unknown>>
    >();
    const validation = await validateSnapshotDocumentSources(entries);
    const documentGraphResult = await measureContentSourcePerformance({
      phase: "document-graph",
      observer: onPerformanceEvent,
      now: performanceNow,
      operation: () =>
        discoverSnapshotDocumentGraph(
          snapshot,
          entries,
          analyzedProperties,
          plan
        ),
    });
    const documentGraph = documentGraphResult?.graph;
    const assetReferences = await measureContentSourcePerformance({
      phase: "asset-references",
      observer: onPerformanceEvent,
      now: performanceNow,
      operation: () =>
        discoverSnapshotAssetReferences({ snapshot, entries, plan }),
    });
    const assetValueReferenceResult =
      await discoverSnapshotAssetValueReferences({
        snapshot,
        entries,
        analyzedProperties,
        validation,
      });
    if (
      await measureContentSourcePerformance({
        phase: "source-validation",
        observer: onPerformanceEvent,
        now: performanceNow,
        operation: () => snapshot.isCurrent(),
      })
    ) {
      return {
        sourceRevision: snapshot.revision,
        entries,
        assetReferences,
        assetValueReferences: assetValueReferenceResult.references,
        sourceIssues: assetValueReferenceResult.sourceIssues,
        documentGraph,
        documentContents: documentGraphResult?.contents,
        assetReferenceIssues: documentGraphResult?.assetReferenceIssues ?? [],
      };
    }
  } catch (error) {
    if (
      await measureContentSourcePerformance({
        phase: "source-validation",
        observer: onPerformanceEvent,
        now: performanceNow,
        operation: () => snapshot.isCurrent(),
      })
    ) {
      throw error;
    }
  }
  throw new ContentSourceChangedError();
};

export const compileContentSource = async ({
  source,
  projectId,
  plan,
  maxBytes,
  onPerformanceEvent,
  performanceNow,
}: {
  source: ContentSource;
  projectId: string;
  plan?: ContentCompilationPlan;
  maxBytes?: number;
  onPerformanceEvent?: ContentSourcePerformanceObserver;
  performanceNow?: () => number;
}): Promise<{
  sourceRevision: string;
  documentGraph?: DocumentGraph;
  artifact: ContentArtifactV1;
  diagnostics: ContentCompilerDiagnostics;
}> => {
  const {
    sourceRevision,
    entries,
    assetReferences,
    assetValueReferences,
    sourceIssues,
    documentGraph,
    documentContents,
    assetReferenceIssues,
  } = await materializeContentSource({
    source,
    plan,
    maximumContentBytes: maxBytes,
    onPerformanceEvent,
    performanceNow,
  });
  const compiled = await compileContentArtifact({
    projectId,
    entries,
    assetReferences,
    assetValueReferences,
    documentGraph,
    documentContents,
    ...(plan === undefined ? {} : { plan }),
    ...(maxBytes === undefined ? {} : { maxBytes }),
  });
  return {
    sourceRevision,
    documentGraph,
    ...compiled,
    diagnostics: {
      ...compiled.diagnostics,
      ...(assetReferenceIssues.length === 0 ? {} : { assetReferenceIssues }),
      ...(sourceIssues.length === 0 ? {} : { sourceIssues }),
    },
  };
};

export const materializeContentSource = async ({
  source,
  plan,
  maximumContentBytes,
  onPerformanceEvent,
  performanceNow,
}: {
  source: ContentSource;
  plan?: ContentCompilationPlan;
  maximumContentBytes?: number;
  onPerformanceEvent?: ContentSourcePerformanceObserver;
  performanceNow?: () => number;
}): Promise<{
  sourceRevision: string;
  entries: readonly ContentCompilerInput[];
  assetReferences: MarkdownAssetReferences;
  assetValueReferences: AssetValueReferences;
  documentGraph?: DocumentGraph;
  documentContents?: Readonly<Record<string, string>>;
  assetReferenceIssues: readonly AssetReferenceIssue[];
  sourceIssues: readonly SourceIssue[];
}> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const snapshot = await source.openSnapshot();
    try {
      return await materializeContentSnapshot({
        snapshot,
        plan,
        maximumContentBytes,
        onPerformanceEvent,
        performanceNow,
      });
    } catch (error) {
      if (error instanceof ContentSourceChangedError === false) {
        throw error;
      }
    }
  }
  throw new ContentSourceChangedError();
};
