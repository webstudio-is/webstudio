import {
  compareStrings,
  serializeJsonDeterministically,
} from "./canonical-json";
import { contentArtifactV1, type ContentArtifactV1 } from "./schema";
import type { CanonicalAssetFileEntry } from "./canonical";
import {
  computeCanonicalAssetRevision,
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "./field-catalog";
import {
  checksumContentArtifact,
  serializeContentArtifact,
  verifyContentArtifact,
} from "./content-artifact";
import { contentEngineLimits } from "./limits";
import {
  getContentDocumentCandidateQueryIds,
  type ContentCompilationPlan,
} from "./compilation-plan";

export * from "./content-artifact";

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

const getByteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;

const getDocumentBytes = (entry: CanonicalAssetFileEntry) =>
  getByteLength(serializeJsonDeterministically(entry.document));

export type ContentCompilerInput = CanonicalAssetFileEntry & {
  content?: string;
};

const getEntryBytes = (entry: ContentCompilerInput) =>
  getDocumentBytes(entry) +
  (entry.content === undefined ? 0 : getByteLength(entry.content));

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
  finalize = true,
}: {
  entries: readonly ContentCompilerInput[];
  sourceDocumentCount: number;
  maxBytes: number;
  unboundedBytes: number;
  finalize?: boolean;
}) => {
  const documents = entries
    .map(({ document }) => document)
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
  const assetRevision = await computeCanonicalAssetRevision(entries);
  const fieldCatalog = toBuilderAssetFieldCatalog(
    await createAssetFieldCatalog(entries)
  );
  const index = contentArtifactV1.parse({
    format: "webstudio-content-database",
    version: 1,
    assetRevision,
    documents,
    ...(Object.keys(contents).length === 0 ? {} : { contents }),
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
  plan,
}: {
  projectId: string;
  entries: readonly ContentCompilerInput[];
  maxBytes?: number;
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
      finalize: false,
    });
    const measured = getByteLength(serializeContentArtifact(unbounded));
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
    for (const entry of [...entries].sort(compareEntryPriority)) {
      const trial = await buildAssetIndex({
        entries: [...selected, entry],
        sourceDocumentCount,
        maxBytes,
        unboundedBytes,
        finalize: false,
      });
      if (getByteLength(serializeContentArtifact(trial)) <= maxBytes) {
        selected.push(entry);
      } else {
        omitted.push(entry);
      }
    }
  }
  const artifact = await verifyContentArtifact(
    await buildAssetIndex({
      entries: selected,
      sourceDocumentCount,
      maxBytes,
      unboundedBytes,
    })
  );
  const boundedBytes = getByteLength(serializeContentArtifact(artifact));
  const describe = (entry: ContentCompilerInput) => ({
    id: entry.assetId,
    path: entry.document.path,
    bytes: getEntryBytes(entry),
    ...(plan === undefined
      ? {}
      : {
          queryIds: getContentDocumentCandidateQueryIds({
            document: entry.document,
            plan,
            available: "all",
          }),
        }),
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
        .sort((left, right) => getEntryBytes(right) - getEntryBytes(left))
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
  plan?: ContentCompilationPlan;
}): Promise<ContentArtifactV1> =>
  (await compileContentArtifact(input)).artifact;
