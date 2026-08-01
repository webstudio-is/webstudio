import { getQueryConditions } from "@webstudio-is/query-builder/runtime";
import type { ContentCompilationPlan } from "./compilation-plan";
import {
  compileContentArtifact,
  type ContentCompilerDiagnostics,
  type ContentCompilerInput,
} from "./asset-index";
import type { ContentArtifactV1 } from "./schema";
import { selectContentHydrationCandidates } from "./compilation-plan";
import {
  createUniqueAssetIdsByPath,
  discoverMarkdownAssetReferenceRanges,
} from "./markdown-assets";
import type { MarkdownAssetReferences } from "./markdown-references";
import { compareStrings } from "./canonical-json";
import { encodeUtf8, type ByteSource } from "./byte-stream";
import { extractMarkdownBody } from "./markdown-body";
import { contentEngineLimits } from "./limits";
import {
  compileDocumentSourceGraph,
  getDocumentFormatByContentType,
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

export interface ContentSource {
  openSnapshot(): Promise<ContentSourceSnapshot>;
}

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
              ({ content }) => content.mode === "markdown-body"
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

const documentUrlBase = "https://content.webstudio.local/";

const getDocumentUrl = (path: string) =>
  new URL(path.split("/").map(encodeURIComponent).join("/"), documentUrlBase)
    .href;

const queryCanUseStructuredProperties = (
  query: ContentCompilationPlan["queries"][number]
) =>
  (query.limit.type !== "literal" ||
    typeof query.limit.value !== "number" ||
    query.limit.value > 0) &&
  (query.output.mode === "all" ||
    (query.output.mode === "fields" &&
      query.output.fields.some(([field]) => field === "properties")) ||
    getQueryConditions(query.where).some(
      ({ field }) => field[0] === "properties"
    ) ||
    query.sort.some(({ field }) => field[0] === "properties"));

const discoverSnapshotDocumentGraph = async (
  snapshot: ContentSourceSnapshot,
  entries: readonly ContentCompilerInput[],
  plan?: ContentCompilationPlan
): Promise<DocumentGraph | undefined> => {
  if (
    snapshot.loadDocumentSources === undefined ||
    (plan !== undefined &&
      plan.queries.some(queryCanUseStructuredProperties) === false)
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
  const supportedFiles = snapshot.files.filter(
    (file) => getDocumentFormatByContentType(file.contentType) !== undefined
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
        documentUrl: getDocumentUrl(file.path),
        revision: file.revision,
        contentRef: file.contentRef,
        format,
        source,
      };
    }),
    ...(plan === undefined
      ? {}
      : {
          rootIds: entries.flatMap(({ assetId }) =>
            sourcesById.has(assetId) ? [assetId] : []
          ),
        }),
  });
  return graph.edges.length === 0 ? undefined : graph;
};

export const materializeContentSnapshot = async ({
  snapshot,
  plan,
  maximumContentBytes = contentEngineLimits.databaseBytes,
}: {
  snapshot: ContentSourceSnapshot;
  plan?: ContentCompilationPlan;
  maximumContentBytes?: number;
}) => {
  validateSnapshot(snapshot);
  try {
    const entries = await snapshot.loadEntries(plan, { maximumContentBytes });
    validateEntries({ snapshot, entries });
    const documentGraph = await discoverSnapshotDocumentGraph(
      snapshot,
      entries,
      plan
    );
    const assetReferences = await discoverSnapshotAssetReferences({
      snapshot,
      entries,
      plan,
    });
    if (await snapshot.isCurrent()) {
      return {
        sourceRevision: snapshot.revision,
        entries,
        assetReferences,
        documentGraph,
      };
    }
  } catch (error) {
    if (await snapshot.isCurrent()) {
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
}: {
  source: ContentSource;
  projectId: string;
  plan?: ContentCompilationPlan;
  maxBytes?: number;
}): Promise<{
  sourceRevision: string;
  documentGraph?: DocumentGraph;
  artifact: ContentArtifactV1;
  diagnostics: ContentCompilerDiagnostics;
}> => {
  const { sourceRevision, entries, assetReferences, documentGraph } =
    await materializeContentSource({
      source,
      plan,
      maximumContentBytes: maxBytes,
    });
  const compiled = await compileContentArtifact({
    projectId,
    entries,
    assetReferences,
    documentGraph,
    ...(plan === undefined ? {} : { plan }),
    ...(maxBytes === undefined ? {} : { maxBytes }),
  });
  return { sourceRevision, documentGraph, ...compiled };
};

export const materializeContentSource = async ({
  source,
  plan,
  maximumContentBytes,
}: {
  source: ContentSource;
  plan?: ContentCompilationPlan;
  maximumContentBytes?: number;
}): Promise<{
  sourceRevision: string;
  entries: readonly ContentCompilerInput[];
  assetReferences: MarkdownAssetReferences;
  documentGraph?: DocumentGraph;
}> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const snapshot = await source.openSnapshot();
    try {
      return await materializeContentSnapshot({
        snapshot,
        plan,
        maximumContentBytes,
      });
    } catch (error) {
      if (error instanceof ContentSourceChangedError === false) {
        throw error;
      }
    }
  }
  throw new ContentSourceChangedError();
};
