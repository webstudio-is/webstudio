import { createAssetContentRevision } from "@webstudio-is/asset-uploader/content-revision";
import {
  AssetContentIntegrityError,
  AssetRevisionConflictError,
  readAssetContentBytes,
  type AssetContentRepository,
} from "@webstudio-is/asset-uploader/content-repository";
import { decodeUtf8 } from "@webstudio-is/content-engine/compiler";
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
import {
  getContentBlockRenderScopeKey,
  getContentStorageChangeRoots,
  getContentStorageIdentityKey,
} from "./content-storage";
import {
  materializeMdxAuthoredContent,
  type MaterializedMdxAuthoredContentRoot,
} from "./mdx-authored-content";
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
    source: string;
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
  | (SessionBase &
      Readonly<{
        status: "recoverable";
        error: Error;
        committedSource?: string;
      }>)
  | Readonly<{
      status: "failed";
      blockInstanceId: string;
      renderScope: string;
      diagnostics: readonly ContentBlockDiagnostic[];
      error: Error;
    }>
  | (UnsavedSessionBase & Readonly<{ status: "failed"; error: Error }>);

export const getContentBlockSessionSource = (
  state: MdxAssetEditingSessionState | undefined
) =>
  state !== undefined && "localSource" in state
    ? state.localSource
    : state !== undefined && "source" in state
      ? state.source
      : undefined;

export const isContentBlockSessionSourceCommitted = ({
  state,
  source,
}: {
  state: MdxAssetEditingSessionState;
  source: string;
}) =>
  (state.status === "saved" && state.source === source) ||
  (state.status === "recoverable" && state.committedSource === source);

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
  variables?: Readonly<Record<string, unknown>>;
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
  preparation?: Promise<MdxAssetEditingSessionState>;
  preparationOpenVersion?: number;
  lifecycleAbortController: AbortController;
  unsavedSource?: string;
  persisted?: LoadedSessionBase;
  cancelled: boolean;
  remoteStateUnknown: boolean;
};

type KeyedSessionState = Extract<
  MdxAssetEditingSessionState,
  { key: string; identity: ContentBlockExternalContentIdentity }
>;

export type MdxAssetSourceReplacementResult =
  | Readonly<{
      status: "applied";
      state: MdxAssetEditingSessionState;
    }>
  | Readonly<{
      status: "blocked";
      state: MdxAssetEditingSessionState;
      reason:
        | "in-flight"
        | "unresolved-write"
        | "source-mismatch"
        | "identity-mismatch"
        | "unauthorized";
      currentSource?: string;
    }>;

export type MdxAssetSourceReplacementPreflight =
  | Readonly<{ status: "ready"; currentSource: string }>
  | Extract<MdxAssetSourceReplacementResult, { status: "blocked" }>;

export type MdxAssetPreparedSourceReplacement =
  | Extract<MdxAssetSourceReplacementResult, { status: "blocked" }>
  | Readonly<{
      status: "ready";
      canApply: () => MdxAssetSourceReplacementPreflight;
      apply: (options?: {
        schedule?: boolean;
      }) => Extract<MdxAssetSourceReplacementResult, { status: "applied" }>;
    }>;

export type MdxAssetSourceController = Readonly<{
  canReplaceSource: (input: {
    key: string;
    expectedSource: string;
  }) => MdxAssetSourceReplacementPreflight;
  replaceSource: (input: {
    key: string;
    expectedSource: string;
    source: string;
  }) => Promise<MdxAssetSourceReplacementResult>;
  prepareSourceReplacement: (input: {
    key: string;
    expectedSource: string;
    source: string;
  }) => Promise<MdxAssetPreparedSourceReplacement>;
  persistSourceReplacement: (input: {
    key: string;
    expectedSource: string;
    source: string;
    isCurrent?: () => boolean;
  }) => Promise<MdxAssetSourceReplacementResult>;
}>;

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
):
  | Extract<MdxAssetEditingSessionState, { localSource: string }>
  | undefined => {
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
  computeContentHash = getAssetContentHash,
  schedule = (callback, delayMilliseconds) =>
    setTimeout(callback, delayMilliseconds),
  cancelScheduled = (handle) =>
    clearTimeout(handle as ReturnType<typeof setTimeout>),
  debounceMilliseconds = 300,
}: {
  repository: Pick<AssetContentRepository, "readContent"> &
    Partial<Pick<AssetContentRepository, "updateContent">>;
  authorizeAsset: MdxAssetSessionAuthorization;
  resolveExpressionAssetId?: (input: {
    expression: string;
    blockInstanceId: string;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
  }) => string | undefined | Promise<string | undefined>;
  computeContentHash?: typeof getAssetContentHash;
  schedule?: MdxAssetSessionSchedule;
  cancelScheduled?: (handle: unknown) => void;
  debounceMilliseconds?: number;
}) => {
  const states = new Map<string, MdxAssetEditingSessionState>();
  const queueEntries = new Map<string, MdxAssetSessionQueueEntry>();
  const keyAliases = new Map<string, string>();
  const openVersions = new Map<string, number>();
  const invalidateLifecycle = (entry: MdxAssetSessionQueueEntry) => {
    entry.preparation = undefined;
    entry.preparationOpenVersion = undefined;
    entry.lifecycleAbortController.abort();
    entry.lifecycleAbortController = new AbortController();
  };

  const resolveKey = (key: string) => {
    let resolved = key;
    const visited = new Set<string>();
    while (keyAliases.has(resolved) && visited.has(resolved) === false) {
      visited.add(resolved);
      resolved = keyAliases.get(resolved)!;
    }
    return resolved;
  };

  const getLoadedRootsForChanges = (
    changes: readonly ContentStorageChange[],
    additionalRoots: readonly MaterializedMdxAuthoredContentRoot[] = []
  ) => {
    const loadedRoots = new Map<string, MaterializedMdxAuthoredContentRoot>();
    for (const root of additionalRoots) {
      loadedRoots.set(getContentStorageIdentityKey(root.identity), root);
    }
    for (const change of changes) {
      for (const root of getContentStorageChangeRoots(change)) {
        if (root.type !== "external") {
          continue;
        }
        const identityKey = getContentStorageIdentityKey(root.identity);
        const state = states.get(resolveKey(identityKey));
        if (
          state !== undefined &&
          "root" in state &&
          getContentStorageIdentityKey(state.identity) === identityKey
        ) {
          loadedRoots.set(identityKey, state.root);
        }
      }
    }
    return [...loadedRoots.values()];
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
      source,
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
      invalidateLifecycle(existing);
      existing.input = input;
      existing.version += 1;
      setQueueEntryKey(existing, key);
      return existing;
    }
    const entry: MdxAssetSessionQueueEntry = {
      key,
      input,
      assetId,
      version: 0,
      lifecycleAbortController: new AbortController(),
      cancelled: false,
      remoteStateUnknown: false,
    };
    queueEntries.set(key, entry);
    return entry;
  };

  const captureLifecycle = ({
    key,
    state,
    entry,
  }: {
    key: string;
    state: KeyedSessionState;
    entry: MdxAssetSessionQueueEntry;
  }) => {
    const openScopeKey = getContentBlockRenderScopeKey(
      state.identity.blockInstanceId,
      state.identity.renderScope
    );
    return {
      key,
      state,
      entry,
      entryVersion: entry.version,
      openScopeKey,
      openVersion: openVersions.get(openScopeKey),
      abortSignal: entry.lifecycleAbortController.signal,
    };
  };

  const getLifecycleState = (lifecycle: ReturnType<typeof captureLifecycle>) =>
    states.get(resolveKey(lifecycle.entry.key)) ??
    states.get(resolveKey(lifecycle.key)) ??
    lifecycle.state;

  const isLifecycleCurrent = (
    lifecycle: ReturnType<typeof captureLifecycle>,
    {
      allowOpenChange = false,
      allowVersionChange = false,
    }: { allowOpenChange?: boolean; allowVersionChange?: boolean } = {}
  ) => {
    const liveKey = resolveKey(lifecycle.key);
    const liveState = states.get(liveKey);
    return (
      lifecycle.abortSignal.aborted === false &&
      (allowOpenChange ||
        openVersions.get(lifecycle.openScopeKey) === lifecycle.openVersion) &&
      (allowVersionChange ||
        lifecycle.entry.version === lifecycle.entryVersion) &&
      lifecycle.entry.cancelled === false &&
      lifecycle.entry.key === liveKey &&
      queueEntries.get(liveKey) === lifecycle.entry &&
      liveState !== undefined &&
      "identity" in liveState &&
      getContentStorageIdentityKey(liveState.identity) === lifecycle.state.key
    );
  };

  const getInvalidatedLifecycleState = (
    lifecycle: ReturnType<typeof captureLifecycle>
  ): MdxAssetEditingSessionState => {
    const live = getLifecycleState(lifecycle);
    return live.status === "cancelled"
      ? live
      : {
          status: "cancelled",
          key: lifecycle.state.key,
          identity: lifecycle.state.identity,
          diagnostics: lifecycle.state.diagnostics,
        };
  };

  const waitForLifecycle = async (
    lifecycle: ReturnType<typeof captureLifecycle>,
    operation: Promise<unknown>
  ) => {
    let stopWaiting!: () => void;
    const invalidated = new Promise<void>((resolve) => {
      stopWaiting = resolve;
      lifecycle.abortSignal.addEventListener("abort", stopWaiting, {
        once: true,
      });
      if (lifecycle.abortSignal.aborted) {
        stopWaiting();
      }
    });
    try {
      await Promise.race([operation, invalidated]);
    } finally {
      lifecycle.abortSignal.removeEventListener("abort", stopWaiting);
    }
  };

  const createSupersededOpenState = (
    input: MdxAssetSessionOpenInput
  ): MdxAssetEditingSessionState => ({
    status: "failed",
    blockInstanceId: input.blockInstanceId,
    renderScope: input.renderScope,
    diagnostics: [],
    error: new Error("MDX Asset session open was superseded"),
  });

  const open = async (
    input: MdxAssetSessionOpenInput
  ): Promise<MdxAssetEditingSessionState> => {
    const openScopeKey = getContentBlockRenderScopeKey(
      input.blockInstanceId,
      input.renderScope
    );
    const openVersion = (openVersions.get(openScopeKey) ?? 0) + 1;
    openVersions.set(openScopeKey, openVersion);
    const isCurrentOpen = () => openVersions.get(openScopeKey) === openVersion;
    let assetId: string | undefined;
    try {
      assetId =
        input.source.type === "asset"
          ? input.source.assetId
          : await resolveExpressionAssetId?.({
              expression: input.source.value,
              blockInstanceId: input.blockInstanceId,
              renderScope: input.renderScope,
              variables: input.variables,
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
    if (isCurrentOpen() === false) {
      return createSupersededOpenState(input);
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
      if (isCurrentOpen() === false) {
        return createSupersededOpenState(input);
      }
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
    if (isCurrentOpen() === false) {
      return createSupersededOpenState(input);
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

    let read: Awaited<ReturnType<typeof readAssetContentBytes>>;
    let bytes: Uint8Array;
    try {
      read = await readAssetContentBytes({
        repository,
        assetId,
        maxSize: contentEngineLimits.hydratedFileBytes,
      });
      bytes = read.bytes;
    } catch (error) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error:
          error instanceof AssetContentIntegrityError
            ? new Error("Asset content identity does not match its bytes")
            : error instanceof Error
              ? error
              : new Error("Asset read failed"),
      };
    }
    if (isCurrentOpen() === false) {
      return createSupersededOpenState(input);
    }
    if (read.asset.projectId !== input.projectId) {
      return {
        status: "failed",
        blockInstanceId: input.blockInstanceId,
        renderScope: input.renderScope,
        diagnostics: [],
        error: new Error("Asset content identity does not match its bytes"),
      };
    }
    const contentHash = await computeContentHash(new Uint8Array(bytes).buffer);
    if (isCurrentOpen() === false) {
      return createSupersededOpenState(input);
    }
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
      if (isCurrentOpen()) {
        states.set(key, conflicting);
      }
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
      if (isCurrentOpen()) {
        states.set(key, conflicting);
      }
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
      if (isCurrentOpen()) {
        states.set(key, recoverable);
        getOrCreateQueueEntry({ key, input, assetId });
      }
      return recoverable;
    }
    try {
      const loaded = await materializeSource({ identity, source, input });
      const saved = {
        ...loaded,
        status: "saved" as const,
      };
      if (isCurrentOpen() === false) {
        return createSupersededOpenState(input);
      }
      states.set(key, saved);
      const entry = getOrCreateQueueEntry({ key, input, assetId });
      entry.persisted = loaded;
      entry.unsavedSource = undefined;
      entry.cancelled = false;
      entry.remoteStateUnknown = false;
      return saved;
    } catch (error) {
      if (isCurrentOpen() === false) {
        return createSupersededOpenState(input);
      }
      if (error instanceof MdxDocumentError) {
        const recoverable = createRecoverableState({ error, identity });
        if (isCurrentOpen()) {
          states.set(key, recoverable);
          getOrCreateQueueEntry({ key, input, assetId });
        }
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
    loadedRoots,
  }: {
    key: string;
    changes: readonly ContentStorageChange[];
    loadedRoots?: readonly MaterializedMdxAuthoredContentRoot[];
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
    const lifecycle = captureLifecycle({ key, state: current, entry });
    try {
      const writes = await prepareMdxContentStorageWrites({
        loadedRoots: getLoadedRootsForChanges(changes, loadedRoots),
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
      if (isLifecycleCurrent(lifecycle) === false) {
        return getInvalidatedLifecycleState(lifecycle);
      }
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
      if (isLifecycleCurrent(lifecycle) === false) {
        return getInvalidatedLifecycleState(lifecycle);
      }
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
      if (isLifecycleCurrent(lifecycle) === false) {
        return getInvalidatedLifecycleState(lifecycle);
      }
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

  const preflightSave = async ({
    key,
    changes,
    loadedRoots,
  }: {
    key: string;
    changes: readonly ContentStorageChange[];
    loadedRoots?: readonly MaterializedMdxAuthoredContentRoot[];
  }): Promise<
    | Readonly<{ status: "ready" }>
    | Readonly<{ status: "blocked"; reason: string }>
  > => {
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
      return {
        status: "blocked",
        reason: "MDX Asset editing session is not ready to save",
      };
    }
    const lifecycle = captureLifecycle({ key, state: current, entry });
    try {
      await prepareMdxContentStorageWrites({
        loadedRoots: getLoadedRootsForChanges(changes, loadedRoots),
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
      if (isLifecycleCurrent(lifecycle) === false) {
        return {
          status: "blocked",
          reason: "MDX Asset editing session changed during preflight",
        };
      }
      return { status: "ready" };
    } catch (error) {
      if (isLifecycleCurrent(lifecycle) === false) {
        return {
          status: "blocked",
          reason: "MDX Asset editing session changed during preflight",
        };
      }
      return {
        status: "blocked",
        reason:
          error instanceof Error
            ? error.message
            : "Unable to prepare MDX Asset save",
      };
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
    const lifecycle = captureLifecycle({ key, state: unsaved, entry });
    const operation = (async (): Promise<MdxAssetEditingSessionState> => {
      let storageCommitted = false;
      let committed:
        | Readonly<{
            identity: ContentBlockExternalContentIdentity;
            source: string;
          }>
        | undefined;
      const getInvalidatedFlushState = () => {
        if (storageCommitted) {
          entry.remoteStateUnknown = true;
        }
        return getInvalidatedLifecycleState(lifecycle);
      };
      const isCurrentFlush = () =>
        isLifecycleCurrent(lifecycle, {
          allowOpenChange: true,
          allowVersionChange: true,
        });
      try {
        const writeAuthorized = await authorizeAsset({
          assetId: unsaved.identity.assetId,
          operation: "write",
          identity: unsaved.identity,
        });
        if (writeAuthorized !== true) {
          throw new Error("MDX Asset is not authorized for writing");
        }
        if (isCurrentFlush() === false) {
          return getInvalidatedFlushState();
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
        if (isCurrentFlush() === false) {
          return getInvalidatedFlushState();
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

        const contentHash = await computeContentHash(
          new Uint8Array(bytes).buffer
        );
        if (isCurrentFlush() === false) {
          return getInvalidatedFlushState();
        }
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
        committed = { identity, source: unsaved.localSource };
        const persisted = await materializeSource({
          identity,
          source: unsaved.localSource,
          input: entry.input,
        });
        if (isCurrentFlush() === false) {
          return getInvalidatedFlushState();
        }
        let loaded = persisted;
        let latest: UnsavedSessionBase | undefined;
        while (true) {
          const preparation = entry.preparation;
          if (preparation !== undefined) {
            await waitForLifecycle(lifecycle, preparation);
            if (isCurrentFlush() === false) {
              return getInvalidatedFlushState();
            }
          }
          const preparedVersion = entry.version;
          latest = getUnsavedState(states.get(entry.key));
          const localSource = latest?.localSource ?? unsaved.localSource;
          loaded =
            latest === undefined
              ? persisted
              : await materializeSource({
                  identity,
                  source: localSource,
                  input: entry.input,
                });
          if (isCurrentFlush() === false) {
            return getInvalidatedFlushState();
          }
          if (
            entry.version === preparedVersion &&
            (entry.preparation === undefined ||
              entry.preparation === preparation)
          ) {
            break;
          }
        }
        const hasNewerChanges =
          entry.version !== flushVersion && latest !== undefined;
        const localSource = latest?.localSource ?? unsaved.localSource;
        entry.persisted = persisted;
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
        if (isCurrentFlush() === false) {
          return getInvalidatedFlushState();
        }
        if (committed !== undefined) {
          entry.persisted = undefined;
          entry.unsavedSource = undefined;
          entry.remoteStateUnknown = false;
          const recoverable = {
            ...createRecoverableState({
              error,
              identity: committed.identity,
            }),
            committedSource: committed.source,
          };
          setQueueEntryKey(entry, recoverable.key);
          states.set(entry.key, recoverable);
          return recoverable;
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

  const scheduleEntry = (entry: MdxAssetSessionQueueEntry) => {
    if (entry.timer !== undefined) {
      cancelScheduled(entry.timer);
    }
    entry.timer = schedule(() => {
      entry.timer = undefined;
      void flushOne(entry.key);
    }, debounceMilliseconds);
  };

  const queueSave = async ({
    key,
    changes,
    loadedRoots,
  }: {
    key: string;
    changes: readonly ContentStorageChange[];
    loadedRoots?: readonly MaterializedMdxAuthoredContentRoot[];
  }) => {
    const entry = queueEntries.get(resolveKey(key));
    if (entry === undefined) {
      throw new Error("MDX Asset editing session does not exist");
    }
    const preparationOpenVersion = openVersions.get(
      getContentBlockRenderScopeKey(
        entry.input.blockInstanceId,
        entry.input.renderScope
      )
    );
    const previousPreparation =
      entry.preparationOpenVersion === preparationOpenVersion
        ? entry.preparation
        : undefined;
    const preparation = (
      previousPreparation ??
      Promise.resolve<MdxAssetEditingSessionState | undefined>(undefined)
    ).then((previous) =>
      previous === undefined ||
      previous.status === "pending" ||
      previous.status === "saved"
        ? prepareSave({ key, changes, loadedRoots })
        : previous
    );
    entry.preparation = preparation;
    entry.preparationOpenVersion = preparationOpenVersion;
    let state: MdxAssetEditingSessionState;
    try {
      state = await preparation;
    } finally {
      if (entry.preparation === preparation) {
        entry.preparation = undefined;
        entry.preparationOpenVersion = undefined;
      }
    }
    if (state.status !== "pending") {
      return state;
    }
    const currentEntry = queueEntries.get(resolveKey(key));
    if (currentEntry === undefined) {
      throw new Error("MDX Asset editing session does not exist");
    }
    scheduleEntry(currentEntry);
    return state;
  };

  const flush = (key: string) => flushOne(key);

  const retry = (key: string) => flushOne(key);

  const canReplaceSource = ({
    key,
    expectedSource,
  }: {
    key: string;
    expectedSource: string;
  }): MdxAssetSourceReplacementPreflight => {
    const resolvedKey = resolveKey(key);
    const entry = queueEntries.get(resolvedKey);
    const state = states.get(resolvedKey);
    if (entry === undefined || state === undefined) {
      throw new Error("MDX Asset editing session does not exist");
    }
    const currentSource =
      getUnsavedState(state)?.localSource ??
      (state.status === "saved"
        ? state.source
        : state.status === "recoverable" && state.committedSource !== undefined
          ? state.committedSource
          : (entry.unsavedSource ?? entry.persisted?.source));
    if (entry.inFlight !== undefined) {
      return { status: "blocked", state, reason: "in-flight", currentSource };
    }
    if (entry.remoteStateUnknown) {
      return {
        status: "blocked",
        state,
        reason: "unresolved-write",
        currentSource,
      };
    }
    if (
      state.status === "failed" ||
      state.status === "conflicting" ||
      (state.status === "recoverable" && state.committedSource === undefined)
    ) {
      return {
        status: "blocked",
        state,
        reason: "unresolved-write",
        currentSource,
      };
    }
    if (currentSource !== expectedSource) {
      return {
        status: "blocked",
        state,
        reason: "source-mismatch",
        currentSource,
      };
    }
    return { status: "ready", currentSource };
  };

  const prepareSourceReplacement = async ({
    key,
    expectedSource,
    source,
  }: {
    key: string;
    expectedSource: string;
    source: string;
  }): Promise<MdxAssetPreparedSourceReplacement> => {
    const preflight = canReplaceSource({ key, expectedSource });
    if (preflight.status === "blocked") {
      return preflight;
    }
    const resolvedKey = resolveKey(key);
    const entry = queueEntries.get(resolvedKey)!;
    const current = states.get(resolvedKey)!;
    const preparedVersion = entry.version;
    const preparedIdentityKey =
      "identity" in current
        ? getContentStorageIdentityKey(current.identity)
        : undefined;
    const canApply = () => {
      const latest = canReplaceSource({ key, expectedSource });
      if (latest.status === "blocked") {
        return latest;
      }
      const latestState = states.get(resolveKey(key))!;
      const latestIdentityKey =
        "identity" in latestState
          ? getContentStorageIdentityKey(latestState.identity)
          : undefined;
      if (latestIdentityKey !== preparedIdentityKey) {
        return {
          status: "blocked" as const,
          state: latestState,
          reason: "identity-mismatch" as const,
          currentSource: latest.currentSource,
        };
      }
      if (entry.version !== preparedVersion) {
        return {
          status: "blocked" as const,
          state: states.get(resolveKey(key))!,
          reason: "source-mismatch" as const,
          currentSource: latest.currentSource,
        };
      }
      return latest;
    };
    const assertCanApply = () => {
      if (canApply().status === "blocked") {
        throw new Error("Prepared MDX Asset source replacement is stale");
      }
    };
    if (source === preflight.currentSource) {
      return {
        status: "ready",
        canApply,
        apply: () => {
          assertCanApply();
          return { status: "applied", state: current };
        },
      };
    }
    if (source === entry.persisted?.source) {
      const persisted = entry.persisted;
      return {
        status: "ready",
        canApply,
        apply: () => {
          assertCanApply();
          if (entry.timer !== undefined) {
            cancelScheduled(entry.timer);
            entry.timer = undefined;
          }
          entry.unsavedSource = undefined;
          entry.cancelled = false;
          invalidateLifecycle(entry);
          entry.version += 1;
          const saved = { ...persisted, status: "saved" as const };
          states.set(resolveKey(key), saved);
          return { status: "applied", state: saved };
        },
      };
    }
    const identity =
      "identity" in current ? current.identity : entry.persisted?.identity;
    if (identity === undefined) {
      return {
        status: "blocked",
        state: current,
        reason: "unresolved-write",
        currentSource: preflight.currentSource,
      };
    }
    let writeAuthorized = false;
    try {
      writeAuthorized =
        (await authorizeAsset({
          assetId: identity.assetId,
          operation: "write",
          identity,
        })) === true;
    } catch {
      // Authorization failures are stable preflight blockers. They must not
      // advance the session or expose transport-specific errors to lifecycle callers.
    }
    if (writeAuthorized === false) {
      return {
        status: "blocked",
        state: current,
        reason: "unauthorized",
        currentSource: preflight.currentSource,
      };
    }
    const loaded = await materializeSource({
      identity,
      source,
      input: entry.input,
    });
    return {
      status: "ready",
      canApply,
      apply: ({ schedule: shouldSchedule = true } = {}) => {
        assertCanApply();
        if (entry.timer !== undefined) {
          cancelScheduled(entry.timer);
          entry.timer = undefined;
        }
        const pending = {
          ...loaded,
          status: "pending" as const,
          localSource: source,
          writes: [
            {
              root: { type: "external" as const, identity },
              expectedRevision: identity.revision,
              source,
            },
          ],
        };
        invalidateLifecycle(entry);
        entry.version += 1;
        entry.unsavedSource = source;
        entry.cancelled = false;
        states.set(resolveKey(key), pending);
        if (shouldSchedule) {
          scheduleEntry(entry);
        }
        return { status: "applied", state: pending };
      },
    };
  };

  const replaceSource = async (input: {
    key: string;
    expectedSource: string;
    source: string;
  }): Promise<MdxAssetSourceReplacementResult> => {
    const prepared = await prepareSourceReplacement(input);
    if (prepared.status === "blocked") {
      return prepared;
    }
    const preflight = prepared.canApply();
    return preflight.status === "ready" ? prepared.apply() : preflight;
  };

  const persistSourceReplacement = async (input: {
    key: string;
    expectedSource: string;
    source: string;
    isCurrent?: () => boolean;
  }): Promise<MdxAssetSourceReplacementResult> => {
    const current = states.get(resolveKey(input.key));
    if (
      current?.status === "recoverable" &&
      current.committedSource === input.source
    ) {
      return input.isCurrent?.() === false
        ? {
            status: "blocked",
            state: current,
            reason: "source-mismatch",
            currentSource: current.committedSource,
          }
        : { status: "applied", state: current };
    }
    if (
      current !== undefined &&
      (current.status === "failed" || current.status === "pending") &&
      "localSource" in current &&
      current.localSource === input.source
    ) {
      if (input.isCurrent?.() === false) {
        return {
          status: "blocked",
          state: current,
          reason: "source-mismatch",
          currentSource: current.localSource,
        };
      }
      const persisted = await flushOne(input.key);
      return isContentBlockSessionSourceCommitted({
        state: persisted,
        source: input.source,
      })
        ? { status: "applied", state: persisted }
        : {
            status: "blocked",
            state: persisted,
            reason: "unresolved-write",
            currentSource: getContentBlockSessionSource(persisted),
          };
    }
    const prepared = await prepareSourceReplacement(input);
    if (prepared.status === "blocked") {
      return prepared;
    }
    const preflight = prepared.canApply();
    if (preflight.status === "blocked") {
      return preflight;
    }
    if (input.isCurrent?.() === false) {
      return {
        status: "blocked",
        state: states.get(resolveKey(input.key))!,
        reason: "source-mismatch",
        currentSource: preflight.currentSource,
      };
    }
    const applied = prepared.apply({ schedule: false });
    if (applied.state.status !== "pending") {
      return applied;
    }
    const persisted = await flushOne(applied.state.key);
    return isContentBlockSessionSourceCommitted({
      state: persisted,
      source: input.source,
    })
      ? { status: "applied", state: persisted }
      : {
          status: "blocked",
          state: persisted,
          reason: "unresolved-write",
          currentSource: getContentBlockSessionSource(persisted),
        };
  };

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
    invalidateLifecycle(entry);
    entry.cancelled = true;
    entry.remoteStateUnknown =
      entry.inFlight !== undefined || current.status === "conflicting";
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
    preflightSave,
    queueSave,
    flush,
    retry,
    canReplaceSource,
    prepareSourceReplacement,
    persistSourceReplacement,
    replaceSource,
    cancel,
    get: (key: string) => states.get(resolveKey(key)),
    list: () => Array.from(states.values()),
  };
};
