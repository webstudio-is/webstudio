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
  isContentCompilationFieldRequired,
  projectContentDatabaseDocument,
  type ContentCompilationPlan,
} from "./compilation-plan";
import { getUtf8ByteLength } from "./byte-stream";
import type { MarkdownAssetReferences } from "./markdown-assets";

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

export type ContentCompilerInput = CanonicalAssetFileEntry & {
  content?: string;
};

const getEntryBytes = (
  entry: ContentCompilerInput,
  plan?: ContentCompilationPlan
) =>
  getDocumentBytes(entry, plan) +
  (entry.content === undefined ? 0 : getUtf8ByteLength(entry.content));

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

const compareEntryPriority = (
  left: CanonicalAssetFileEntry,
  right: CanonicalAssetFileEntry
) => {
  const leftCreatedAt =
    left.document.createdAt === undefined
      ? undefined
      : Date.parse(left.document.createdAt);
  const rightCreatedAt =
    right.document.createdAt === undefined
      ? undefined
      : Date.parse(right.document.createdAt);
  if (leftCreatedAt !== undefined && rightCreatedAt === undefined) {
    return -1;
  }
  if (leftCreatedAt === undefined && rightCreatedAt !== undefined) {
    return 1;
  }
  if (
    leftCreatedAt !== undefined &&
    rightCreatedAt !== undefined &&
    leftCreatedAt !== rightCreatedAt
  ) {
    return rightCreatedAt - leftCreatedAt;
  }
  return (
    compareStrings(left.document.path, right.document.path) ||
    compareStrings(left.assetId, right.assetId)
  );
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
  plan,
  finalize = true,
}: {
  entries: readonly ContentCompilerInput[];
  sourceDocumentCount: number;
  maxBytes: number;
  unboundedBytes: number;
  assetReferences?: MarkdownAssetReferences;
  plan?: ContentCompilationPlan;
  finalize?: boolean;
}) => {
  const documents = entries
    .map(({ document }) => projectContentDatabaseDocument({ document, plan }))
    .sort((left, right) => compareStrings(left._id, right._id));
  const contents = Object.fromEntries(
    entries
      .filter(
        (entry): entry is ContentCompilerInput & { content: string } =>
          entry.content !== undefined
      )
      .sort((left, right) =>
        compareStrings(left.document.contentRef, right.document.contentRef)
      )
      .map((entry) => [entry.document.contentRef, entry.content])
  );
  const includedContentRefs = new Set(
    entries.map(({ document }) => document.contentRef)
  );
  const includedAssetReferences = Object.fromEntries(
    Object.entries(assetReferences ?? {}).filter(([contentRef]) =>
      includedContentRefs.has(contentRef)
    )
  );
  const catalog = await createAssetFieldCatalog(entries);
  const assetRevision = catalog.canonicalRevision;
  const completeFieldCatalog = toBuilderAssetFieldCatalog(catalog);
  const fieldCatalog = {
    ...completeFieldCatalog,
    fields: Object.fromEntries(
      Object.entries(completeFieldCatalog.fields).filter(([, field]) => {
        const queryPath = field.queryPath;
        return (
          queryPath !== undefined &&
          isContentCompilationFieldRequired({ plan, field: queryPath })
        );
      })
    ),
  };
  const index = contentArtifactV1.parse({
    format: "webstudio-content-database",
    version: 1,
    assetRevision,
    documents,
    ...(Object.keys(contents).length === 0 ? {} : { contents }),
    ...(Object.keys(includedAssetReferences).length === 0
      ? {}
      : { assetReferences: includedAssetReferences }),
    fieldCatalog,
    database: { maxBytes, unboundedBytes, sourceDocumentCount },
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
  plan,
}: {
  projectId: string;
  entries: readonly ContentCompilerInput[];
  maxBytes?: number;
  assetReferences?: MarkdownAssetReferences;
  plan?: ContentCompilationPlan;
}): Promise<{
  artifact: ContentArtifactV1;
  diagnostics: ContentCompilerDiagnostics;
}> => {
  if (Number.isSafeInteger(maxBytes) === false || maxBytes <= 0) {
    throw new Error("Content database byte limit must be a positive integer");
  }
  validateEntries({ projectId, entries });
  const sourceDocumentCount = entries.length;
  let unboundedBytes = 0;
  let unbounded: ContentArtifactV1;
  for (let attempt = 0; ; attempt += 1) {
    unbounded = await buildAssetIndex({
      entries,
      sourceDocumentCount,
      maxBytes,
      unboundedBytes,
      assetReferences,
      plan,
      finalize: false,
    });
    const measured = getUtf8ByteLength(serializeContentArtifact(unbounded));
    if (measured === unboundedBytes) {
      break;
    }
    if (attempt >= 4) {
      throw new Error("Content database size did not stabilize");
    }
    unboundedBytes = measured;
  }
  const selected: ContentCompilerInput[] = [];
  const omitted: ContentCompilerInput[] = [];
  if (unboundedBytes <= maxBytes) {
    selected.push(...entries);
  } else {
    const prioritized = [...entries].sort(compareEntryPriority);
    let selectedContentRefs = new Set<string>();
    const emptyArtifact = await buildAssetIndex({
      entries: selected,
      sourceDocumentCount,
      maxBytes,
      unboundedBytes,
      assetReferences,
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
      if (minimumAdditionalBytes <= maxBytes - selectedBytes) {
        const trial = await buildAssetIndex({
          entries: [...selected, ...candidates],
          sourceDocumentCount,
          maxBytes,
          unboundedBytes,
          assetReferences,
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
  plan?: ContentCompilationPlan;
}): Promise<ContentArtifactV1> =>
  (await compileContentArtifact(input)).artifact;
