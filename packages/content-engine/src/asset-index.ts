import {
  compareStrings,
  serializeJsonDeterministically,
} from "./canonical-json";
import { contentArtifactV1, type ContentArtifactV1 } from "./schema";
import type { CanonicalAssetFileEntry } from "./canonical";
import {
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "./field-catalog";
import {
  checksumContentArtifact,
  serializeContentArtifact,
} from "./content-artifact";
import { contentEngineLimits } from "./limits";
import {
  getContentDocumentCandidateQueryIds,
  compareContentEntryPriority,
  createContentCompilationPlan,
  isContentDocumentCandidate,
  isContentCompilationFieldRequired,
  projectContentDatabaseDocument,
  selectContentHydrationCandidates,
  type ContentCompilationPlan,
} from "./compilation-plan";
import { getUtf8ByteLength } from "./byte-stream";
import type { MarkdownAssetReferences } from "./markdown-references";
import {
  canMaterializeContentCompilationQuery,
  materializeContentCompilationQueries,
} from "./materialized-query";
import {
  createDocumentGraphArtifact,
  getDocumentGraphClosure,
  getDocumentGraphQueryRootIds,
  type DocumentGraph,
  type DocumentGraphArtifactV1,
} from "./document-graph";
import { getQueryConditions } from "@webstudio-is/query-builder/runtime";
import type { AssetValueReferences } from "./asset-value-references";

export const contentCompilationGeneration = 1;

export type ContentCompilerDiagnostics = {
  maxBytes: number;
  unboundedBytes: number;
  boundedBytes: number;
  includedDocumentCount: number;
  omittedDocumentCount: number;
  omittedDocuments: Array<{
    id: string;
    path: string;
    bytes: number;
    queryIds: string[];
  }>;
  largestDocuments: Array<{ id: string; path: string; bytes: number }>;
  affectedQueryIds: string[];
  assetReferenceIssues?: readonly {
    code: "ASSET_NOT_FOUND";
    sourceDocumentId: string;
    referenceId: string;
    assetUrl: string;
  }[];
  sourceIssues?: readonly {
    severity: "error" | "warning";
    code: string;
    message: string;
    assetId: string;
    path: string;
    line?: number;
    column?: number;
  }[];
};

const getDocumentBytes = (
  entry: CanonicalAssetFileEntry,
  plan?: ContentCompilationPlan
) =>
  getUtf8ByteLength(
    serializeJsonDeterministically(
      projectContentDatabaseDocument({ document: entry.document, plan })
    )
  );

const pathsOverlap = (
  left: readonly (string | number)[],
  right: readonly (string | number)[]
) => {
  const length = Math.min(left.length, right.length);
  return left
    .slice(0, length)
    .every((segment, index) => segment === right[index]);
};

const isQueryEvaluationAffectedByAssetValues = ({
  query,
  assetValueReferences,
}: {
  query: ContentCompilationPlan["queries"][number];
  assetValueReferences?: AssetValueReferences;
}) => {
  const evaluationPaths = [
    ...getQueryConditions(query.where).map(({ field }) => field),
    ...query.sort.map(({ field }) => field),
  ];
  return Object.values(assetValueReferences ?? {})
    .flat()
    .some(({ path }) =>
      evaluationPaths.some((field) => pathsOverlap(path, field))
    );
};

const isDocumentEvaluationAffectedByAssetValues = ({
  documentId,
  plan,
  assetValueReferences,
}: {
  documentId: string;
  plan: ContentCompilationPlan;
  assetValueReferences?: AssetValueReferences;
}) =>
  plan.queries.some((query) =>
    isQueryEvaluationAffectedByAssetValues({
      query,
      assetValueReferences: {
        [documentId]: assetValueReferences?.[documentId] ?? [],
      },
    })
  );

export type ContentCompilerInput = CanonicalAssetFileEntry & {
  content?: string;
  contentRequired?: true;
};

const selectMarkdownBodyReferenceIds = ({
  entries,
  plan,
}: {
  entries: readonly ContentCompilerInput[];
  plan?: ContentCompilationPlan;
}) => {
  if (plan === undefined) {
    return new Set<string>();
  }
  return selectContentHydrationCandidates({
    documents: entries.map(({ document }) => document),
    plan: {
      ...plan,
      queries: plan.queries.filter(
        ({ content }) => content.mode === "markdown-body-ref"
      ),
    },
  });
};

const excludeReferencedMarkdownBodies = ({
  entries,
  documentGraph,
  plan,
  referencedIds,
}: {
  entries: readonly ContentCompilerInput[];
  documentGraph: DocumentGraph;
  plan?: ContentCompilationPlan;
  referencedIds: ReadonlySet<string>;
}) => {
  if (plan === undefined) {
    return entries;
  }
  const embeddedQueryPlan = {
    ...plan,
    queries: plan.queries.filter(
      ({ content }) => content.mode !== "markdown-body-ref"
    ),
  };
  const embeddedIds = selectContentHydrationCandidates({
    documents: entries.map(({ document }) => document),
    plan: embeddedQueryPlan,
  });
  const graphNodeIds = new Set(documentGraph.nodes.map(({ id }) => id));
  const missingNodeIds = [...referencedIds].filter(
    (assetId) => graphNodeIds.has(assetId) === false
  );
  if (missingNodeIds.length > 0) {
    throw new Error(
      `Markdown body reference queries require graph nodes for: ${missingNodeIds.join(
        ", "
      )}`
    );
  }
  return entries.map((entry) => {
    if (
      referencedIds.has(entry.assetId) === false ||
      embeddedIds.has(entry.assetId)
    ) {
      return entry;
    }
    const {
      content: _content,
      contentRequired: _contentRequired,
      ...rest
    } = entry;
    return rest;
  });
};

const getEntryBytes = (
  entry: ContentCompilerInput,
  plan?: ContentCompilationPlan
) =>
  getDocumentBytes(entry, plan) +
  (entry.content === undefined
    ? entry.contentRequired === true
      ? entry.document.size
      : 0
    : getUtf8ByteLength(entry.content));

const getMinimumAdditionalBytes = ({
  entries,
  selectedContentRefs,
  plan,
}: {
  entries: readonly ContentCompilerInput[];
  selectedContentRefs: ReadonlySet<string>;
  plan?: ContentCompilationPlan;
}) => {
  const contentRefs = new Set(selectedContentRefs);
  let bytes = 0;
  for (const entry of entries) {
    bytes += getDocumentBytes(entry, plan);
    if (
      entry.content !== undefined &&
      contentRefs.has(entry.document.contentRef) === false
    ) {
      contentRefs.add(entry.document.contentRef);
      bytes += getUtf8ByteLength(entry.content);
    }
  }
  return bytes;
};

const validateEntries = ({
  projectId,
  entries,
}: {
  projectId: string;
  entries: readonly ContentCompilerInput[];
}) => {
  const assetIds = new Set<string>();
  const contentByRef = new Map<string, string>();
  for (const entry of entries) {
    if (entry.projectId !== projectId) {
      throw new Error("Content database cannot combine multiple projects");
    }
    if (
      entry.assetId !== entry.document._id ||
      entry.revision !== entry.document.revision
    ) {
      throw new Error("Canonical content metadata identity is inconsistent");
    }
    if (assetIds.has(entry.assetId)) {
      throw new Error("Content database contains duplicate documents");
    }
    assetIds.add(entry.assetId);
    if (entry.content === undefined) {
      continue;
    }
    const previousContent = contentByRef.get(entry.document.contentRef);
    if (previousContent !== undefined && previousContent !== entry.content) {
      throw new Error(
        "Content database contains conflicting content for one reference"
      );
    }
    contentByRef.set(entry.document.contentRef, entry.content);
  }
};

const buildAssetIndex = async ({
  entries,
  sourceDocumentCount,
  maxBytes,
  unboundedBytes,
  assetReferences,
  assetValueReferences,
  documentGraph,
  documentContents,
  plan,
  finalize = true,
}: {
  entries: readonly ContentCompilerInput[];
  sourceDocumentCount: number;
  maxBytes: number;
  unboundedBytes: number;
  assetReferences?: MarkdownAssetReferences;
  assetValueReferences?: AssetValueReferences;
  documentGraph?: DocumentGraphArtifactV1;
  documentContents?: Readonly<Record<string, string>>;
  plan?: ContentCompilationPlan;
  finalize?: boolean;
}) => {
  const sourceDocuments = entries.map(({ document }) => document);
  const sourceCatalog = await createAssetFieldCatalog(entries);
  const assetRevision = sourceCatalog.canonicalRevision;
  const completeSourceFieldCatalog = toBuilderAssetFieldCatalog(sourceCatalog);
  const materializableQueries =
    plan?.queries.filter(
      (query) =>
        isQueryEvaluationAffectedByAssetValues({
          query,
          assetValueReferences,
        }) === false &&
        (documentGraph === undefined ||
          getDocumentGraphQueryRootIds({ graph: documentGraph, query })
            .length === 0)
    ) ?? [];
  const materialized =
    plan === undefined
      ? {
          values: {},
          materializedQueries: new Set<
            ContentCompilationPlan["queries"][number]
          >(),
        }
      : await materializeContentCompilationQueries({
          queries: materializableQueries,
          catalog: completeSourceFieldCatalog,
          documents: sourceDocuments,
        });
  const runtimeQueries =
    plan?.queries.filter(
      (query) => materialized.materializedQueries.has(query) === false
    ) ?? [];
  const runtimePlan =
    plan === undefined
      ? undefined
      : (createContentCompilationPlan(runtimeQueries) ?? {
          standardFields: [],
          structuredPropertyPaths: [],
          excerpt: false,
          metadataError: false,
          queries: [],
        });
  const runtimeEntries =
    runtimePlan === undefined
      ? entries
      : runtimePlan.queries.length === 0
        ? []
        : entries.filter(
            ({ document }) =>
              isDocumentEvaluationAffectedByAssetValues({
                documentId: document._id,
                plan: runtimePlan,
                assetValueReferences,
              }) ||
              isContentDocumentCandidate({
                document,
                plan: runtimePlan,
                available: "all",
              })
          );
  const documents = runtimeEntries
    .map(({ document }) =>
      projectContentDatabaseDocument({ document, plan: runtimePlan })
    )
    .sort((left, right) => compareStrings(left._id, right._id));
  const includedDocumentIds = new Set(entries.map(({ assetId }) => assetId));
  const graphNodeIds = new Set(documentGraph?.nodes.map(({ id }) => id) ?? []);
  const runtimeGraphRootIds = runtimeEntries
    .map(({ assetId }) => assetId)
    .filter((assetId) => graphNodeIds.has(assetId));
  const runtimeGraphNodes =
    documentGraph === undefined
      ? []
      : getDocumentGraphClosure({
          graph: documentGraph,
          rootIds: runtimeGraphRootIds,
        });
  for (const node of runtimeGraphNodes) {
    includedDocumentIds.add(node.id);
  }
  const embeddedGraphNodeIds = new Set(
    documentGraph === undefined
      ? []
      : getDocumentGraphClosure({
          graph: documentGraph,
          rootIds: runtimeEntries
            .filter(({ content }) => content !== undefined)
            .map(({ assetId }) => assetId)
            .filter((assetId) => graphNodeIds.has(assetId)),
        }).map(({ id }) => id)
  );
  const contents = Object.fromEntries([
    ...runtimeGraphNodes.flatMap((node) => {
      if (embeddedGraphNodeIds.has(node.id) === false) {
        return [];
      }
      const content = documentContents?.[node.contentRef];
      return content === undefined
        ? []
        : ([[node.contentRef, content]] as const);
    }),
    ...runtimeEntries
      .filter(
        (entry): entry is ContentCompilerInput & { content: string } =>
          entry.content !== undefined
      )
      .sort((left, right) =>
        compareStrings(left.document.contentRef, right.document.contentRef)
      )
      .map((entry) => [entry.document.contentRef, entry.content] as const),
  ]);
  const includedContentRefs = new Set([
    ...runtimeEntries.map(({ document }) => document.contentRef),
    ...Object.keys(contents),
  ]);
  const includedAssetReferences = Object.fromEntries(
    Object.entries(assetReferences ?? {}).filter(([contentRef]) =>
      includedContentRefs.has(contentRef)
    )
  );
  const includedAssetValueReferences = Object.fromEntries(
    Object.entries(assetValueReferences ?? {}).filter(([documentId]) =>
      includedDocumentIds.has(documentId)
    )
  );
  const runtimeCatalog =
    runtimeEntries === entries
      ? sourceCatalog
      : await createAssetFieldCatalog(runtimeEntries);
  const completeFieldCatalog = {
    ...toBuilderAssetFieldCatalog(runtimeCatalog),
    canonicalRevision: assetRevision,
  };
  const fieldCatalog = {
    ...completeFieldCatalog,
    fields: Object.fromEntries(
      Object.entries(completeFieldCatalog.fields).filter(([, field]) => {
        const queryPath = field.queryPath;
        return (
          queryPath !== undefined &&
          isContentCompilationFieldRequired({
            plan: runtimePlan,
            field: queryPath,
          })
        );
      })
    ),
  };
  const index = contentArtifactV1.parse({
    format: "webstudio-content-database",
    version: 1,
    assetRevision,
    documents,
    ...(documentGraph === undefined ? {} : { documentGraph }),
    ...(Object.keys(contents).length === 0 ? {} : { contents }),
    ...(Object.keys(includedAssetReferences).length === 0
      ? {}
      : { assetReferences: includedAssetReferences }),
    ...(Object.keys(includedAssetValueReferences).length === 0
      ? {}
      : { assetValueReferences: includedAssetValueReferences }),
    fieldCatalog,
    ...(Object.keys(materialized.values).length === 0
      ? {}
      : { queries: materialized.values }),
    database: {
      maxBytes,
      unboundedBytes,
      sourceDocumentCount,
      ...(runtimeEntries.length === entries.length
        ? {}
        : { includedDocumentCount: entries.length }),
    },
    integrity: {
      algorithm: "sha256",
      checksum: `sha256:${"0".repeat(64)}`,
    },
  });
  if (finalize === false) {
    return index;
  }
  return contentArtifactV1.parse({
    ...index,
    integrity: {
      algorithm: "sha256",
      checksum: await checksumContentArtifact(index),
    },
  });
};

export const compileContentArtifact = async ({
  projectId,
  entries,
  maxBytes = contentEngineLimits.databaseBytes,
  assetReferences,
  assetValueReferences,
  documentGraph,
  documentContents,
  plan,
}: {
  projectId: string;
  entries: readonly ContentCompilerInput[];
  maxBytes?: number;
  assetReferences?: MarkdownAssetReferences;
  assetValueReferences?: AssetValueReferences;
  documentGraph?: DocumentGraph;
  documentContents?: Readonly<Record<string, string>>;
  plan?: ContentCompilationPlan;
}): Promise<{
  artifact: ContentArtifactV1;
  diagnostics: ContentCompilerDiagnostics;
}> => {
  if (Number.isSafeInteger(maxBytes) === false || maxBytes <= 0) {
    throw new Error("Content database byte limit must be a positive integer");
  }
  const referencedMarkdownBodyIds = selectMarkdownBodyReferenceIds({
    entries,
    plan,
  });
  if (referencedMarkdownBodyIds.size > 0 && documentGraph === undefined) {
    throw new Error("Markdown body reference queries require a document graph");
  }
  if (documentGraph !== undefined) {
    entries = excludeReferencedMarkdownBodies({
      entries,
      documentGraph,
      plan,
      referencedIds: referencedMarkdownBodyIds,
    });
  }
  validateEntries({ projectId, entries });
  const documentGraphArtifact =
    documentGraph === undefined
      ? undefined
      : await createDocumentGraphArtifact(documentGraph);
  const sourceDocumentCount = entries.length;
  const hasMaterializableQueries =
    plan?.queries.some(
      (query) =>
        canMaterializeContentCompilationQuery(query) &&
        (documentGraph === undefined ||
          getDocumentGraphQueryRootIds({ graph: documentGraph, query })
            .length === 0)
    ) === true;
  const unavailable = entries.filter(
    (entry) => entry.contentRequired === true && entry.content === undefined
  );
  const available = entries.filter(
    (entry) => entry.contentRequired !== true || entry.content !== undefined
  );
  const unavailableBytes = unavailable.reduce(
    (total, entry) => total + getEntryBytes(entry, plan),
    0
  );
  let unboundedBytes = 0;
  let unbounded: ContentArtifactV1;
  for (let attempt = 0; ; attempt += 1) {
    unbounded = await buildAssetIndex({
      entries: available,
      sourceDocumentCount,
      maxBytes,
      unboundedBytes,
      assetReferences,
      assetValueReferences,
      documentGraph: documentGraphArtifact,
      documentContents,
      plan,
      finalize: false,
    });
    const measured =
      getUtf8ByteLength(serializeContentArtifact(unbounded)) + unavailableBytes;
    if (measured === unboundedBytes) {
      break;
    }
    if (attempt >= 4) {
      throw new Error("Content database size did not stabilize");
    }
    unboundedBytes = measured;
  }
  const selected: ContentCompilerInput[] = [];
  const omitted: ContentCompilerInput[] = [...unavailable];
  if (unboundedBytes <= maxBytes) {
    selected.push(...available);
  } else {
    const prioritized = [...available].sort(compareContentEntryPriority);
    let selectedContentRefs = new Set<string>();
    const emptyArtifact = await buildAssetIndex({
      entries: selected,
      sourceDocumentCount,
      maxBytes,
      unboundedBytes,
      assetReferences,
      assetValueReferences,
      documentGraph: documentGraphArtifact,
      documentContents,
      plan,
      finalize: false,
    });
    let selectedBytes = getUtf8ByteLength(
      serializeContentArtifact(emptyArtifact)
    );
    if (selectedBytes > maxBytes) {
      throw new Error("Content database byte limit is too small");
    }

    const selectCandidates = async (
      candidates: readonly ContentCompilerInput[]
    ): Promise<void> => {
      if (candidates.length === 0) {
        return;
      }
      const minimumAdditionalBytes = getMinimumAdditionalBytes({
        entries: candidates,
        selectedContentRefs,
        plan,
      });
      if (
        hasMaterializableQueries ||
        minimumAdditionalBytes <= maxBytes - selectedBytes
      ) {
        const trial = await buildAssetIndex({
          entries: [...selected, ...candidates],
          sourceDocumentCount,
          maxBytes,
          unboundedBytes,
          assetReferences,
          assetValueReferences,
          documentGraph: documentGraphArtifact,
          documentContents,
          plan,
          finalize: false,
        });
        const trialBytes = getUtf8ByteLength(serializeContentArtifact(trial));
        if (trialBytes <= maxBytes) {
          selected.push(...candidates);
          selectedBytes = trialBytes;
          selectedContentRefs = new Set(
            selected
              .filter(({ content }) => content !== undefined)
              .map(({ document }) => document.contentRef)
          );
          return;
        }
      }
      if (candidates.length === 1) {
        omitted.push(candidates[0]);
        return;
      }
      const middle = Math.floor(candidates.length / 2);
      await selectCandidates(candidates.slice(0, middle));
      await selectCandidates(candidates.slice(middle));
    };

    await selectCandidates(prioritized);
  }
  const artifact = await buildAssetIndex({
    entries: selected,
    sourceDocumentCount,
    maxBytes,
    unboundedBytes,
    assetReferences,
    assetValueReferences,
    documentGraph: documentGraphArtifact,
    documentContents,
    plan,
  });
  const boundedBytes = getUtf8ByteLength(serializeContentArtifact(artifact));
  if (boundedBytes > maxBytes) {
    throw new Error("Content database selection exceeds the byte limit");
  }
  const describe = (entry: ContentCompilerInput) => ({
    id: entry.assetId,
    path: entry.document.path,
    bytes: getEntryBytes(entry, plan),
  });
  const omittedDocuments = omitted.map((entry) => ({
    ...describe(entry),
    queryIds:
      plan === undefined
        ? []
        : getContentDocumentCandidateQueryIds({
            document: entry.document,
            plan,
            available: "all",
          }),
  }));
  return {
    artifact,
    diagnostics: {
      maxBytes,
      unboundedBytes,
      boundedBytes,
      includedDocumentCount: selected.length,
      omittedDocumentCount: omitted.length,
      omittedDocuments,
      largestDocuments: [...entries]
        .sort(
          (left, right) =>
            getEntryBytes(right, plan) - getEntryBytes(left, plan)
        )
        .slice(0, 10)
        .map(describe),
      affectedQueryIds: [
        ...new Set(omittedDocuments.flatMap(({ queryIds }) => queryIds)),
      ].sort(compareStrings),
    },
  };
};

export const createAssetIndex = async (input: {
  projectId: string;
  entries: readonly ContentCompilerInput[];
  maxBytes?: number;
  assetReferences?: MarkdownAssetReferences;
  assetValueReferences?: AssetValueReferences;
  documentGraph?: DocumentGraph;
  documentContents?: Readonly<Record<string, string>>;
  plan?: ContentCompilationPlan;
}): Promise<ContentArtifactV1> =>
  (await compileContentArtifact(input)).artifact;
