import { createAssetContentRevision } from "@webstudio-is/asset-uploader/content-revision";
import {
  AssetRevisionConflictError,
  type AssetRepository,
} from "@webstudio-is/asset-uploader/server";
import {
  decodeUtf8,
  readBoundedBytes,
} from "@webstudio-is/content-engine/compiler";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import {
  MdxDocumentError,
  parseMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  getAssetContentHash,
  getAssetDisplayNameParts,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type { BuilderState } from "../state/builder-state";
import { getRequiredComponentInsertData } from "./components";
import { getContentStorageIdentityKey } from "./content-storage";
import { materializeMdxAuthoredContent } from "./mdx-authored-content";
import { materializeMdxTemplates } from "./mdx-materialization";
import {
  prepareMdxContentStorageWrites,
  type PendingMdxContentStorageWrite,
} from "./mdx-storage-adapter";
import { resolveMdxTemplates } from "./mdx-template-resolution";
import type { ContentStorageChange } from "./mutation";

type SessionBase = Readonly<{
  key: string;
  identity: ContentBlockExternalContentIdentity;
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

type LoadedSessionBase = SessionBase &
  Readonly<{
    root: ReturnType<typeof materializeMdxAuthoredContent>;
  }>;

type UnsavedSessionBase = LoadedSessionBase &
  Readonly<{
    writes: readonly PendingMdxContentStorageWrite[];
    localSource: string;
  }>;

export type MdxAssetEditingSessionState =
  | (LoadedSessionBase & Readonly<{ status: "saved" }>)
  | (UnsavedSessionBase & Readonly<{ status: "pending" }>)
  | (SessionBase & Readonly<{ status: "conflicting" }>)
  | (UnsavedSessionBase & Readonly<{ status: "conflicting"; error: Error }>)
  | (SessionBase & Readonly<{ status: "cancelled" }>)
  | (SessionBase & Readonly<{ status: "recoverable"; error: Error }>)
  | Readonly<{
      status: "failed";
      blockInstanceId: string;
      renderScope: string;
      diagnostics: readonly ContentBlockDiagnostic[];
      error: Error;
    }>
  | (UnsavedSessionBase & Readonly<{ status: "failed"; error: Error }>);

export type MdxAssetSessionAuthorization = (input: {
  assetId: string;
  operation: "read" | "write";
  identity?: ContentBlockExternalContentIdentity;
}) => boolean | Promise<boolean>;

export type MdxAssetSessionOpenInput = Readonly<{
  blockInstanceId: string;
  source: ContentBlockSource;
  renderScope: string;
  expectedRevision?: string;
  state: BuilderState;
  projectId: string;
}>;

type MdxAssetSessionSchedule = (
  callback: () => void,
  delayMilliseconds: number
) => unknown;

type MdxAssetSessionQueueEntry = {
  key: string;
  input: MdxAssetSessionOpenInput;
  assetId: string;
  version: number;
  timer?: unknown;
  inFlight?: Promise<MdxAssetEditingSessionState>;
  unsavedSource?: string;
  cancelled: boolean;
};

const toParserDiagnostic = ({
  error,
  identity,
}: {
  error: unknown;
  identity: ContentBlockExternalContentIdentity;
}): ContentBlockDiagnostic => {
  if (error instanceof MdxDocumentError && error.code === "unsafe-mdx") {
    return {
      code: "unsafe-mdx",
      severity: "error",
      blockInstanceId: identity.blockInstanceId,
      assetId: identity.assetId,
      contentRef: identity.contentRef,
      renderScope: identity.renderScope,
      nodeType: error.nodeType ?? "unknown",
      reason: error.reason ?? error.message,
      sourceRange: error.sourceRange,
    };
  }
  return {
    code: "invalid-mdx",
    severity: "error",
    blockInstanceId: identity.blockInstanceId,
    assetId: identity.assetId,
    contentRef: identity.contentRef,
    renderScope: identity.renderScope,
    message: error instanceof Error ? error.message : "Unable to parse MDX",
    sourceRange:
      error instanceof MdxDocumentError ? error.sourceRange : undefined,
  };
};

const createRecoverableState = ({
  error,
  identity,
}: {
  error: unknown;
  identity: ContentBlockExternalContentIdentity;
}) => ({
  status: "recoverable" as const,
  key: getContentStorageIdentityKey(identity),
  identity,
  diagnostics: [toParserDiagnostic({ error, identity })],
  error: error instanceof Error ? error : new Error("Unable to parse MDX"),
});

const getUnsavedState = (
  state: MdxAssetEditingSessionState | undefined
): UnsavedSessionBase | undefined => {
  if (
    state !== undefined &&
    "localSource" in state &&
    "writes" in state &&
    "root" in state
  ) {
    return state;
  }
};

export const createMdxAssetEditingSession = ({
  repository,
  authorizeAsset,
  resolveExpressionAssetId,
  schedule = (callback, delayMilliseconds) =>
    setTimeout(callback, delayMilliseconds),
  cancelScheduled = (handle) =>
    clearTimeout(handle as ReturnType<typeof setTimeout>),
  debounceMilliseconds = 300,
}: {
  repository: Pick<AssetRepository, "readContent"> &
    Partial<Pick<AssetRepository, "updateContent">>;
  authorizeAsset: MdxAssetSessionAuthorization;
  resolveExpressionAssetId?: (input: {
    expression: string;
    blockInstanceId: string;
    renderScope: string;
  }) => string | undefined | Promise<string | undefined>;
  schedule?: MdxAssetSessionSchedule;
  cancelScheduled?: (handle: unknown) => void;
  debounceMilliseconds?: number;
}) => {
  const states = new Map<string, MdxAssetEditingSessionState>();
  const queueEntries = new Map<string, MdxAssetSessionQueueEntry>();
  const keyAliases = new Map<string, string>();

  const resolveKey = (key: string) => {
    let resolved = key;
    const visited = new Set<string>();
    while (keyAliases.has(resolved) && visited.has(resolved) === false) {
      visited.add(resolved);
      resolved = keyAliases.get(resolved)!;
    }
    return resolved;
  };

  const materializeSource = async ({
    identity,
    source,
    input,
  }: {
    identity: ContentBlockExternalContentIdentity;
    source: string;
    input: MdxAssetSessionOpenInput;
  }): Promise<LoadedSessionBase> => {
    const document = await parseMdxDocument({ source });
    const data = getRequiredComponentInsertData(input.state);
    const resolution = resolveMdxTemplates({
      document,
      identity,
      instances: data.instances,
      metas: componentMetas,
    });
    const templateMaterialization = await materializeMdxTemplates({
      identity,
      resolution,
      data,
      metas: componentMetas,
      projectId: input.projectId,
    });
    return {
      key: getContentStorageIdentityKey(identity),
      identity,
      root: materializeMdxAuthoredContent({
        identity,
        document,
        templateMaterialization,
      }),
      diagnostics: templateMaterialization.diagnostics,
    };
  };

  const setQueueEntryKey = (
    entry: MdxAssetSessionQueueEntry,
    nextKey: string
  ) => {
    if (entry.key === nextKey) {
      return;
    }
    const previousKey = entry.key;
    queueEntries.delete(previousKey);
    states.delete(previousKey);
    entry.key = nextKey;
    queueEntries.set(nextKey, entry);
    keyAliases.set(previousKey, nextKey);
  };

  const findQueueEntry = ({
    blockInstanceId,
    assetId,
    renderScope,
  }: {
    blockInstanceId: string;
    assetId: string;
    renderScope: string;
  }) =>
    Array.from(queueEntries.values()).find(
      (entry) =>
        entry.input.blockInstanceId === blockInstanceId &&
        entry.assetId === assetId &&
        entry.input.renderScope === renderScope
    );

  const getOrCreateQueueEntry = ({
    key,
    input,
    assetId,
  }: {
    key: string;
    input: MdxAssetSessionOpenInput;
    assetId: string;
  }) => {
    const existing =
      queueEntries.get(resolveKey(key)) ??
      findQueueEntry({
        blockInstanceId: input.blockInstanceId,
        assetId,
        renderScope: input.renderScope,
      });
    if (existing !== undefined) {
      existing.input = input;
      setQueueEntryKey(existing, key);
      return existing;
    }
    const entry: MdxAssetSessionQueueEntry = {
      key,
      input,
      assetId,
      version: 0,
      cancelled: false,
    };
    queueEntries.set(key, entry);
    return entry;
  };

  const open = async (
    input: MdxAssetSessionOpenInput
  ): Promise<MdxAssetEditingSessionState> => {
    let assetId: string | undefined;
    try {
      assetId =
        input.source.type === "asset"
          ? input.source.assetId
          : await resolveExpressionAssetId?.({
              expression: input.source.value,
              blockInstanceId: input.blockInstanceId,
              renderScope: input.renderScope,
            });
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error:
          error instanceof Error
            ? error
            : new Error("Content Block source resolution failed"),
      };
    }
    if (assetId === undefined || assetId.length === 0) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: new Error("Content Block source did not resolve to an Asset"),
      };
    }
    const activeEntry = findQueueEntry({
      blockInstanceId: input.blockInstanceId,
      assetId,
      renderScope: input.renderScope,
    });
    if (activeEntry?.cancelled && activeEntry.inFlight !== undefined) {
      await activeEntry.inFlight;
    }
    const unsaved = Array.from(states.values()).find((state) => {
      const candidate = getUnsavedState(state);
      return (
        candidate !== undefined &&
        candidate.identity.blockInstanceId === input.blockInstanceId &&
        candidate.identity.assetId === assetId &&
        candidate.identity.renderScope === input.renderScope
      );
    });
    if (unsaved !== undefined) {
      return unsaved;
    }
    let readAuthorized = false;
    try {
      readAuthorized =
        (await authorizeAsset({ assetId, operation: "read" })) === true;
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error:
          error instanceof Error
            ? error
            : new Error("MDX Asset read authorization failed"),
      };
    }
    if (readAuthorized === false) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [
          {
            code: "authorization-failed",
            severity: "error",
            blockInstanceId: input.blockInstanceId,
            assetId,
            renderScope: input.renderScope,
            operation: "read",
          },
        ],
        error: new Error("MDX Asset is not authorized for reading"),
      };
    }

    let read: Awaited<ReturnType<AssetRepository["readContent"]>>;
    let bytes: Uint8Array;
    try {
      read = await repository.readContent({ assetId });
      bytes = await readBoundedBytes(
        read.data,
        contentEngineLimits.hydratedFileBytes
      );
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: error instanceof Error ? error : new Error("Asset read failed"),
      };
    }

    const contentHash = await getAssetContentHash(new Uint8Array(bytes).buffer);
    const revisionInput = {
      storageName: read.asset.name,
      updatedAt: read.asset.updatedAt ?? read.asset.createdAt,
      size: read.asset.size,
    };
    const contentRevision = createAssetContentRevision({
      ...revisionInput,
      contentHash,
    });
    const legacyRevision = createAssetContentRevision(revisionInput);
    const revision =
      input.expectedRevision === legacyRevision
        ? legacyRevision
        : contentRevision;
    const identity: ContentBlockExternalContentIdentity = {
      blockInstanceId: input.blockInstanceId,
      assetId: read.asset.id,
      revision,
      contentRef: read.asset.name,
      format: "mdx",
      renderScope: input.renderScope,
    };
    const key = getContentStorageIdentityKey(identity);
    if (read.asset.id !== assetId) {
      const conflicting = {
        status: "conflicting" as const,
        key,
        identity,
        diagnostics: [
          {
            code: "changed-binding" as const,
            severity: "error" as const,
            blockInstanceId: input.blockInstanceId,
            assetId,
            contentRef: identity.contentRef,
            renderScope: input.renderScope,
            loadedAssetId: read.asset.id,
            resolvedAssetId: assetId,
          },
        ],
      };
      states.set(key, conflicting);
      return conflicting;
    }
    if (
      read.asset.type !== "file" ||
      getAssetDisplayNameParts(read.asset).ext.toLowerCase() !== "mdx"
    ) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: new Error("Content Block source Asset must be an MDX file"),
      };
    }
    if (
      input.expectedRevision !== undefined &&
      input.expectedRevision !== contentRevision &&
      input.expectedRevision !== legacyRevision
    ) {
      const conflicting = {
        status: "conflicting" as const,
        key,
        identity,
        diagnostics: [
          {
            code: "stale-revision" as const,
            severity: "error" as const,
            blockInstanceId: input.blockInstanceId,
            assetId,
            contentRef: identity.contentRef,
            renderScope: input.renderScope,
            expectedRevision: input.expectedRevision,
            actualRevision: revision,
          },
        ],
      };
      states.set(key, conflicting);
      return conflicting;
    }
    const existing = states.get(key);
    if (existing?.status === "pending") {
      return existing;
    }

    let source: string;
    try {
      source = decodeUtf8(bytes);
    } catch (error) {
      const recoverable = createRecoverableState({ error, identity });
      states.set(key, recoverable);
      getOrCreateQueueEntry({ key, input, assetId });
      return recoverable;
    }
    try {
      const loaded = await materializeSource({ identity, source, input });
      const saved = {
        ...loaded,
        status: "saved" as const,
      };
      states.set(key, saved);
      getOrCreateQueueEntry({ key, input, assetId });
      return saved;
    } catch (error) {
      if (error instanceof MdxDocumentError) {
        const recoverable = createRecoverableState({ error, identity });
        states.set(key, recoverable);
        getOrCreateQueueEntry({ key, input, assetId });
        return recoverable;
      }
      const failed = {
        status: "failed" as const,
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [] as const,
        error:
          error instanceof Error
            ? error
            : new Error("MDX materialization failed"),
      };
      return failed;
    }
  };

  const prepareSave = async ({
    key,
    changes,
  }: {
    key: string;
    changes: readonly ContentStorageChange[];
  }): Promise<MdxAssetEditingSessionState> => {
    const resolvedKey = resolveKey(key);
    const current = states.get(resolvedKey);
    const entry = queueEntries.get(resolvedKey);
    if (
      current === undefined ||
      entry === undefined ||
      (current.status !== "saved" &&
        current.status !== "pending" &&
        !(current.status === "failed" && "root" in current))
    ) {
      throw new Error("MDX Asset editing session is not ready to save");
    }
    try {
      const writes = await prepareMdxContentStorageWrites({
        loadedRoots: [current.root],
        changes,
        authorizeAssetWrite: async (identity) =>
          identity.assetId === current.identity.assetId &&
          getContentStorageIdentityKey(identity) === current.key &&
          (await authorizeAsset({
            assetId: current.identity.assetId,
            operation: "write",
            identity: current.identity,
          })),
      });
      if (writes.length === 0) {
        return current;
      }
      if (writes.length !== 1) {
        throw new Error("An MDX Asset session must prepare exactly one write");
      }
      const localSource = writes[0].source;
      const loaded = await materializeSource({
        identity: current.identity,
        source: localSource,
        input: entry.input,
      });
      const pending = {
        ...loaded,
        status: "pending" as const,
        writes,
        localSource,
      };
      entry.version += 1;
      entry.unsavedSource = localSource;
      entry.cancelled = false;
      states.set(resolvedKey, pending);
      return pending;
    } catch (error) {
      const failed = {
        status: "failed" as const,
        blockInstanceId: current.identity.blockInstanceId,
        renderScope: current.identity.renderScope,
        diagnostics: [] as const,
        error:
          error instanceof Error
            ? error
            : new Error("Unable to prepare MDX Asset save"),
      };
      return failed;
    }
  };

  const flushOne = async (
    key: string
  ): Promise<MdxAssetEditingSessionState> => {
    const resolvedKey = resolveKey(key);
    const entry = queueEntries.get(resolvedKey);
    const initial = states.get(resolvedKey);
    if (entry === undefined || initial === undefined) {
      throw new Error("MDX Asset editing session does not exist");
    }
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
      entry.timer = undefined;
    }
    if (entry.inFlight !== undefined) {
      await entry.inFlight;
      return flushOne(entry.key);
    }
    const unsaved = getUnsavedState(initial);
    if (unsaved === undefined) {
      return initial;
    }
    const updateContent = repository.updateContent;
    if (updateContent === undefined) {
      const failed = {
        ...unsaved,
        status: "failed" as const,
        error: new Error("MDX Asset repository does not support writes"),
      };
      states.set(resolvedKey, failed);
      return failed;
    }
    if (unsaved.writes.length !== 1) {
      throw new Error("An MDX Asset session must flush exactly one write");
    }
    const write = unsaved.writes[0];
    if (
      write.expectedRevision !== unsaved.identity.revision ||
      getContentStorageIdentityKey(write.root.identity) !== unsaved.key
    ) {
      throw new Error(
        "Pending MDX Asset write identity does not match session"
      );
    }

    const flushVersion = entry.version;
    const flushKey = entry.key;
    const operation = (async (): Promise<MdxAssetEditingSessionState> => {
      let storageCommitted = false;
      try {
        const writeAuthorized = await authorizeAsset({
          assetId: unsaved.identity.assetId,
          operation: "write",
          identity: unsaved.identity,
        });
        if (writeAuthorized !== true) {
          throw new Error("MDX Asset is not authorized for writing");
        }
        if (entry.cancelled) {
          return states.get(entry.key) ?? initial;
        }
        const bytes = new TextEncoder().encode(unsaved.localSource);
        const asset = await updateContent({
          assetId: unsaved.identity.assetId,
          expectedName: unsaved.identity.contentRef,
          data: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          }),
        });
        storageCommitted = true;
        if (entry.cancelled) {
          return states.get(entry.key) ?? initial;
        }
        if (
          asset.id !== unsaved.identity.assetId ||
          asset.projectId !== entry.input.projectId ||
          asset.type !== "file" ||
          asset.name.length === 0 ||
          asset.name === unsaved.identity.contentRef ||
          getAssetDisplayNameParts(asset).ext.toLowerCase() !== "mdx" ||
          asset.size !== bytes.byteLength
        ) {
          throw new AssetRevisionConflictError(
            "Asset repository returned a stale MDX revision"
          );
        }

        const contentHash = await getAssetContentHash(
          new Uint8Array(bytes).buffer
        );
        const identity: ContentBlockExternalContentIdentity = {
          ...unsaved.identity,
          revision: createAssetContentRevision({
            storageName: asset.name,
            updatedAt: asset.updatedAt ?? asset.createdAt,
            size: asset.size,
            contentHash,
          }),
          contentRef: asset.name,
        };
        const latest = getUnsavedState(states.get(entry.key));
        const hasNewerChanges =
          entry.version !== flushVersion && latest !== undefined;
        const localSource = hasNewerChanges
          ? latest.localSource
          : unsaved.localSource;
        const loaded = await materializeSource({
          identity,
          source: localSource,
          input: entry.input,
        });
        setQueueEntryKey(entry, loaded.key);
        if (hasNewerChanges) {
          const pending = {
            ...loaded,
            status: "pending" as const,
            localSource,
            writes: [
              {
                root: { type: "external" as const, identity },
                expectedRevision: identity.revision,
                source: localSource,
              },
            ],
          };
          states.set(entry.key, pending);
          return pending;
        }
        entry.unsavedSource = undefined;
        const saved = { ...loaded, status: "saved" as const };
        states.set(entry.key, saved);
        return saved;
      } catch (error) {
        if (entry.cancelled) {
          return states.get(entry.key) ?? initial;
        }
        const latest = getUnsavedState(states.get(entry.key)) ?? unsaved;
        const writeError =
          error instanceof Error ? error : new Error("MDX Asset write failed");
        const failed: MdxAssetEditingSessionState =
          storageCommitted || writeError instanceof AssetRevisionConflictError
            ? { ...latest, status: "conflicting", error: writeError }
            : { ...latest, status: "failed", error: writeError };
        states.set(entry.key, failed);
        return failed;
      }
    })();
    entry.inFlight = operation;
    const result = await operation;
    entry.inFlight = undefined;
    if (
      result.status === "pending" &&
      entry.cancelled === false &&
      entry.version !== flushVersion
    ) {
      return flushOne(entry.key);
    }
    if (flushKey !== entry.key) {
      keyAliases.set(flushKey, entry.key);
    }
    return result;
  };

  const queueSave = async ({
    key,
    changes,
  }: {
    key: string;
    changes: readonly ContentStorageChange[];
  }) => {
    const state = await prepareSave({ key, changes });
    if (state.status !== "pending") {
      return state;
    }
    const entry = queueEntries.get(resolveKey(key));
    if (entry === undefined) {
      throw new Error("MDX Asset editing session does not exist");
    }
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
    }
    entry.timer = schedule(() => {
      entry.timer = undefined;
      void flushOne(entry.key);
    }, debounceMilliseconds);
    return state;
  };

  const flush = (key: string) => flushOne(key);

  const retry = (key: string) => flushOne(key);

  const reloadRemote = async (key: string) => {
    const resolvedKey = resolveKey(key);
    const entry = queueEntries.get(resolvedKey);
    if (entry === undefined) {
      throw new Error("MDX Asset editing session does not exist");
    }
    if (entry.inFlight !== undefined) {
      throw new Error(
        "Cannot reload an MDX Asset while its write is in flight"
      );
    }
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
      entry.timer = undefined;
    }
    const unsavedSource = entry.unsavedSource;
    states.delete(resolvedKey);
    const state = await open({
      ...entry.input,
      source: { type: "asset", assetId: entry.assetId },
      expectedRevision: undefined,
    });
    const migrated = queueEntries.get(resolveKey(entry.key)) ?? entry;
    migrated.unsavedSource = unsavedSource;
    return state;
  };

  const copyUnsavedSource = (key: string) =>
    queueEntries.get(resolveKey(key))?.unsavedSource;

  const cancel = (key: string): MdxAssetEditingSessionState => {
    const resolvedKey = resolveKey(key);
    const current = states.get(resolvedKey);
    const entry = queueEntries.get(resolvedKey);
    if (current === undefined || entry === undefined || !("key" in current)) {
      throw new Error("MDX Asset editing session does not exist");
    }
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
      entry.timer = undefined;
    }
    entry.cancelled = true;
    entry.version += 1;
    const cancelled = {
      status: "cancelled" as const,
      key: current.key,
      identity: current.identity,
      diagnostics: current.diagnostics,
    };
    states.set(resolvedKey, cancelled);
    return cancelled;
  };

  return {
    open,
    prepareSave,
    queueSave,
    flush,
    retry,
    reloadRemote,
    copyUnsavedSource,
    cancel,
    get: (key: string) => states.get(resolveKey(key)),
    list: () => Array.from(states.values()),
  };
};
