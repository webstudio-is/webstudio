import {
  validateAssetResourceQuery,
  type CanonicalAssetFileEntry,
  type ImmutableAssetResourceIndexStore,
} from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import {
  AssetResourceIndexBuildCancelledError,
  buildPersistAndActivateAssetResourceIndex,
} from "./resource-index-build";

type ScheduledBuild = {
  controller: AbortController;
  timer: ReturnType<typeof setTimeout>;
  reject: (reason: unknown) => void;
};

export class AssetResourceIndexBuildScheduler {
  private readonly scheduled = new Map<string, ScheduledBuild>();
  private readonly debounceMs: number;

  constructor(debounceMs: number) {
    if (Number.isFinite(debounceMs) === false || debounceMs < 0) {
      throw new Error("Resource index debounce must be non-negative");
    }
    this.debounceMs = debounceMs;
  }

  schedule({
    client,
    store,
    projectId,
    resourceId,
    query,
    loadEntries,
  }: {
    client: Client;
    store: ImmutableAssetResourceIndexStore;
    projectId: string;
    resourceId: string;
    query: string;
    loadEntries: () => Promise<readonly CanonicalAssetFileEntry[]>;
  }) {
    validateAssetResourceQuery(query);
    const key = `${projectId}\u0000${resourceId}`;
    this.cancel(key);
    const controller = new AbortController();
    return new Promise<
      Awaited<ReturnType<typeof buildPersistAndActivateAssetResourceIndex>>
    >((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          const entries = await loadEntries();
          if (controller.signal.aborted) {
            throw new AssetResourceIndexBuildCancelledError();
          }
          resolve(
            await buildPersistAndActivateAssetResourceIndex({
              client,
              store,
              projectId,
              resourceId,
              query,
              entries,
              signal: controller.signal,
            })
          );
        } catch (error) {
          reject(error);
        } finally {
          if (this.scheduled.get(key)?.controller === controller) {
            this.scheduled.delete(key);
          }
        }
      }, this.debounceMs);
      this.scheduled.set(key, { controller, timer, reject });
    });
  }

  cancel(key: string) {
    const scheduled = this.scheduled.get(key);
    if (scheduled === undefined) {
      return false;
    }
    clearTimeout(scheduled.timer);
    scheduled.controller.abort();
    scheduled.reject(new AssetResourceIndexBuildCancelledError());
    this.scheduled.delete(key);
    return true;
  }
}
