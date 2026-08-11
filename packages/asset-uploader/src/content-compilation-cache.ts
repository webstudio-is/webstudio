import {
  createContentDatabase,
  type ContentArtifactV1,
  type ContentCompilationPlan,
} from "@webstudio-is/content-engine";
import {
  canonicalAssetMetadataExtractorGeneration,
  contentCompilationGeneration,
  serializeJsonDeterministically,
} from "@webstudio-is/content-engine/compiler";

export type ContentCompilationCache = ReturnType<
  typeof createContentCompilationCache
>;

export const createContentCompilationCacheKey = ({
  projectId,
  sourceRevision,
  plan,
  strict,
  maxBytes,
}: {
  projectId: string;
  sourceRevision: string;
  plan?: ContentCompilationPlan;
  strict: boolean;
  maxBytes: number;
}) =>
  serializeJsonDeterministically({
    projectId,
    sourceRevision,
    metadataExtractorGeneration: canonicalAssetMetadataExtractorGeneration,
    contentCompilationGeneration,
    plan: plan ?? null,
    strict,
    maxBytes,
  });

export const createContentCompilationCache = (maximumEntries = 32) => {
  if (Number.isSafeInteger(maximumEntries) === false || maximumEntries <= 0) {
    throw new Error("Content compilation cache size must be positive");
  }
  type CacheEntry = {
    promise: Promise<ContentArtifactV1>;
    settled: boolean;
  };
  const entries = new Map<string, CacheEntry>();
  const trim = () => {
    while (entries.size > maximumEntries) {
      const completed = [...entries].find(([, entry]) => entry.settled);
      if (completed === undefined) {
        return;
      }
      entries.delete(completed[0]);
    }
  };
  const getOrCreateWithStatus = (
    key: string,
    create: () => Promise<ContentArtifactV1>
  ): {
    promise: Promise<ContentArtifactV1>;
    status: "hit" | "coalesced" | "miss";
  } => {
    const existing = entries.get(key);
    if (existing !== undefined) {
      entries.delete(key);
      entries.set(key, existing);
      return {
        promise: existing.promise,
        status: existing.settled ? "hit" : "coalesced",
      };
    }
    let entry: CacheEntry;
    const promise = create().then(
      (value) => {
        entry.settled = true;
        trim();
        return value;
      },
      (error) => {
        if (entries.get(key) === entry) {
          entries.delete(key);
        }
        throw error;
      }
    );
    entry = { promise, settled: false };
    entries.set(key, entry);
    trim();
    return { promise: entry.promise, status: "miss" };
  };
  return {
    getOrCreate: (
      key: string,
      create: () => Promise<ContentArtifactV1>
    ): Promise<ContentArtifactV1> => getOrCreateWithStatus(key, create).promise,
    getOrCreateWithStatus,
    clear: () => entries.clear(),
    get size() {
      return entries.size;
    },
  };
};

const databaseByArtifact = new WeakMap<
  ContentArtifactV1,
  ReturnType<typeof createContentDatabase>
>();

export const getContentDatabaseForArtifact = (artifact: ContentArtifactV1) => {
  const existing = databaseByArtifact.get(artifact);
  if (existing !== undefined) {
    return existing;
  }
  const database = createContentDatabase({ artifact });
  databaseByArtifact.set(artifact, database);
  return database;
};
