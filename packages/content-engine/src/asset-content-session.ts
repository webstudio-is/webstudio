import { decodeUtf8 } from "@webstudio-is/content-engine/compiler";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import {
  AssetRevisionConflictError,
  readAssetContentBytes,
  type AssetContentDescriptor,
  type AssetContentRepository,
} from "./asset-content-repository";

type AssetContentSessionStatus =
  | "saved"
  | "pending"
  | "saving"
  | "failed"
  | "conflicting";

export type AssetContentSessionState = Readonly<{
  asset: AssetContentDescriptor;
  source: string;
  status: AssetContentSessionStatus;
  error?: Error;
}>;

export type AssetContentSession = ReturnType<typeof createAssetContentSession>;

type Entry = {
  asset: AssetContentDescriptor;
  source: string;
  committedSource: string;
  status: AssetContentSessionStatus;
  error?: Error;
  timer?: unknown;
  flushPromise?: Promise<AssetContentSessionState>;
};

type Schedule = (callback: () => void, delayMilliseconds: number) => unknown;

export const createAssetContentSession = ({
  repository,
  authorize,
  schedule = (callback, delayMilliseconds) =>
    setTimeout(callback, delayMilliseconds),
  cancelScheduled = (handle) =>
    clearTimeout(handle as ReturnType<typeof setTimeout>),
  debounceMilliseconds = 300,
}: {
  repository: AssetContentRepository;
  authorize: (input: {
    assetId: string;
    operation: "read" | "write";
  }) => boolean | Promise<boolean>;
  schedule?: Schedule;
  cancelScheduled?: (handle: unknown) => void;
  debounceMilliseconds?: number;
}) => {
  const entries = new Map<string, Entry>();
  const openPromises = new Map<string, Promise<AssetContentSessionState>>();
  const listeners = new Set<
    (assetId: string, state: AssetContentSessionState) => void
  >();
  let disposed = false;

  const toState = (entry: Entry): AssetContentSessionState => ({
    asset: entry.asset,
    source: entry.source,
    status: entry.status,
    ...(entry.error === undefined ? {} : { error: entry.error }),
  });

  const publish = (assetId: string, entry: Entry) => {
    const state = toState(entry);
    for (const listener of listeners) {
      listener(assetId, state);
    }
    return state;
  };

  const requireEntry = (assetId: string) => {
    const entry = entries.get(assetId);
    if (entry === undefined) {
      throw new Error(`Asset content session "${assetId}" is not open`);
    }
    return entry;
  };

  const requireAuthorization = async (
    assetId: string,
    operation: "read" | "write"
  ) => {
    if ((await authorize({ assetId, operation })) !== true) {
      throw new Error(
        `Asset "${assetId}" is not authorized for content ${operation}`
      );
    }
  };

  const flush = async (assetId: string): Promise<AssetContentSessionState> => {
    if (disposed) {
      throw new Error("Asset content session is disposed");
    }
    const entry = requireEntry(assetId);
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
      entry.timer = undefined;
    }
    if (entry.flushPromise !== undefined) {
      return entry.flushPromise;
    }
    if (entry.status === "conflicting") {
      throw entry.error ?? new AssetRevisionConflictError("Conflict");
    }

    const promise = (async () => {
      while (entry.source !== entry.committedSource) {
        const source = entry.source;
        try {
          await requireAuthorization(assetId, "write");
          entry.status = "saving";
          entry.error = undefined;
          publish(assetId, entry);
          const asset = await repository.updateContent({
            assetId,
            expectedName: entry.asset.name,
            data: new Response(source).body!,
          });
          entry.asset = asset;
          entry.committedSource = source;
          entry.status =
            entry.source === entry.committedSource ? "saved" : "pending";
          publish(assetId, entry);
        } catch (error) {
          entry.error =
            error instanceof Error ? error : new Error("Unable to save Asset");
          entry.status =
            error instanceof AssetRevisionConflictError
              ? "conflicting"
              : "failed";
          publish(assetId, entry);
          throw entry.error;
        }
      }
      entry.status = "saved";
      entry.error = undefined;
      return publish(assetId, entry);
    })();
    entry.flushPromise = promise;
    try {
      return await promise;
    } finally {
      entry.flushPromise = undefined;
    }
  };

  const open = async (assetId: string) => {
    if (disposed) {
      throw new Error("Asset content session is disposed");
    }
    const existing = entries.get(assetId);
    if (existing !== undefined) {
      return toState(existing);
    }
    const pending = openPromises.get(assetId);
    if (pending !== undefined) {
      return pending;
    }
    const promise = (async () => {
      await requireAuthorization(assetId, "read");
      const { asset, bytes } = await readAssetContentBytes({
        repository,
        assetId,
        maxSize: contentEngineLimits.hydratedFileBytes,
      });
      if (disposed) {
        throw new Error("Asset content session is disposed");
      }
      const source = decodeUtf8(bytes);
      const entry: Entry = {
        asset,
        source,
        committedSource: source,
        status: "saved",
      };
      entries.set(assetId, entry);
      return publish(assetId, entry);
    })();
    openPromises.set(assetId, promise);
    try {
      return await promise;
    } finally {
      openPromises.delete(assetId);
    }
  };

  const reload = async (
    assetId: string,
    { expectedName }: { expectedName?: string } = {}
  ) => {
    if (disposed) {
      throw new Error("Asset content session is disposed");
    }
    const entry = requireEntry(assetId);
    if (
      entry.flushPromise !== undefined ||
      (entry.source !== entry.committedSource && entry.status !== "conflicting")
    ) {
      throw new Error("Asset content session has unsaved changes");
    }
    const assetBeforeReload = entry.asset;
    const sourceBeforeReload = entry.source;
    const committedSourceBeforeReload = entry.committedSource;
    const statusBeforeReload = entry.status;
    await requireAuthorization(assetId, "read");
    const { asset, bytes } = await readAssetContentBytes({
      repository,
      assetId,
      maxSize: contentEngineLimits.hydratedFileBytes,
    });
    if (
      entry.flushPromise !== undefined ||
      entry.source !== sourceBeforeReload ||
      entry.committedSource !== committedSourceBeforeReload ||
      entry.status !== statusBeforeReload
    ) {
      throw new Error("Asset content session has unsaved changes");
    }
    if (entry.asset !== assetBeforeReload) {
      throw new AssetRevisionConflictError(
        "Asset content session changed while it was reloading"
      );
    }
    if (expectedName !== undefined && asset.name !== expectedName) {
      throw new AssetRevisionConflictError(
        "This file changed since it was opened. Reload it before continuing."
      );
    }
    if (disposed) {
      throw new Error("Asset content session is disposed");
    }
    const source = decodeUtf8(bytes);
    entry.asset = asset;
    entry.source = source;
    entry.committedSource = source;
    entry.status = "saved";
    entry.error = undefined;
    return publish(assetId, entry);
  };

  const save = (assetId: string, source: string) => {
    if (disposed) {
      throw new Error("Asset content session is disposed");
    }
    const entry = requireEntry(assetId);
    if (entry.status === "conflicting") {
      throw entry.error ?? new AssetRevisionConflictError("Conflict");
    }
    entry.source = source;
    entry.status = entry.source === entry.committedSource ? "saved" : "pending";
    entry.error = undefined;
    publish(assetId, entry);
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
    }
    if (entry.status === "pending") {
      entry.timer = schedule(() => {
        entry.timer = undefined;
        void flush(assetId).catch(() => {});
      }, debounceMilliseconds);
    } else {
      entry.timer = undefined;
    }
  };

  const retry = async (assetId: string) => {
    const entry = requireEntry(assetId);
    if (entry.status === "conflicting") {
      throw entry.error ?? new AssetRevisionConflictError("Conflict");
    }
    entry.status = entry.source === entry.committedSource ? "saved" : "pending";
    entry.error = undefined;
    return flush(assetId);
  };

  const flushAll = async () => {
    const results = await Promise.allSettled(
      Array.from(entries.keys(), (assetId) => flush(assetId))
    );
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (failed !== undefined) {
      throw failed.reason;
    }
  };

  return {
    open,
    reload,
    save,
    flush,
    flushAll,
    retry,
    get: (assetId: string) => {
      const entry = entries.get(assetId);
      return entry === undefined ? undefined : toState(entry);
    },
    subscribe: (
      listener: (assetId: string, state: AssetContentSessionState) => void
    ) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      disposed = true;
      for (const entry of entries.values()) {
        if (entry.timer !== undefined) {
          cancelScheduled(entry.timer);
        }
      }
      listeners.clear();
    },
  };
};
