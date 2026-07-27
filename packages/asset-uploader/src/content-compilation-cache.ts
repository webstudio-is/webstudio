import {
  createContentDatabase,
  type ContentArtifactV1,
} from "@webstudio-is/content-engine";
import type { ContentCompilationPlan } from "@webstudio-is/content-engine/compiler";
import { serializeJsonDeterministically } from "@webstudio-is/project-store";

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
    plan: plan ?? null,
    strict,
    maxBytes,
  });

export const createContentCompilationCache = (maximumEntries = 32) => {
  if (Number.isSafeInteger(maximumEntries) === false || maximumEntries <= 0) {
    throw new Error("Content compilation cache size must be positive");
  }
  const entries = new Map<string, Promise<ContentArtifactV1>>();
  return {
    getOrCreate: (
      key: string,
      create: () => Promise<ContentArtifactV1>
    ): Promise<ContentArtifactV1> => {
      const existing = entries.get(key);
      if (existing !== undefined) {
        entries.delete(key);
        entries.set(key, existing);
        return existing;
      }
      const pending = create().catch((error) => {
        if (entries.get(key) === pending) {
          entries.delete(key);
        }
        throw error;
      });
      entries.set(key, pending);
      while (entries.size > maximumEntries) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) {
          break;
        }
        entries.delete(oldestKey);
      }
      return pending;
    },
    clear: () => entries.clear(),
    get size() {
      return entries.size;
    },
  };
};

export const sharedContentCompilationCache = createContentCompilationCache();

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
