import { atom } from "nanostores";
import { nanoid } from "nanoid";
import {
  createMdxAssetUndoEntry,
  createMdxAssetUndoJournal,
  type BuilderRuntimeMutation,
  type MdxAssetEditingSessionState,
  type MdxAssetSourceController,
} from "@webstudio-is/project-build/runtime";
import { $publisher, subscribe } from "~/shared/pubsub";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import {
  createBuilderHistoryCoordinator,
  createOrderedStorageHistoryRecords,
  getMdxHistoryRecordBlocker,
  isProjectHistoryTraversal,
  type MdxHistoryMetadata,
  type MdxHistoryOwner,
  type StorageHistoryExecutionResult,
} from "./content-block-history";

type MdxHistoryMessage =
  | Readonly<{ type: "ready"; owner: "canvas"; epoch: string }>
  | Readonly<{ type: "closed"; owner: "canvas"; epoch: string }>
  | Readonly<{ type: "begin"; entry: MdxHistoryMetadata; epoch: string }>
  | Readonly<{ type: "record"; entry: MdxHistoryMetadata; epoch: string }>
  | Readonly<{
      type: "drop";
      owner: MdxHistoryOwner;
      entryIds: string[];
      epoch: string;
    }>
  | Readonly<{ type: "discard-redo"; owner: MdxHistoryOwner }>
  | Readonly<{
      type: "discard-entries";
      owner: "canvas";
      entryIds: string[];
      epoch: string;
    }>
  | Readonly<{ type: "reset"; owner: MdxHistoryOwner }>
  | Readonly<{
      type: "project-mutation";
      owner: MdxHistoryOwner;
      epoch: string;
    }>
  | Readonly<{
      type: "request";
      requestId: string;
      owner: MdxHistoryOwner;
      direction: "undo" | "redo";
      entryId: string;
      epoch: string;
    }>
  | Readonly<{
      type: "result";
      requestId: string;
      owner: MdxHistoryOwner;
      entryId: string;
      result: StorageHistoryExecutionResult;
      epoch: string;
    }>;

declare module "~/shared/pubsub" {
  interface PubsubMap {
    mdxHistory: MdxHistoryMessage;
  }
}

type EditingSession = MdxAssetSourceController &
  Readonly<{
    get: (key: string) => MdxAssetEditingSessionState | undefined;
  }>;

type LocalEntry = Readonly<{
  session: EditingSession;
  key: string;
  publishState: (state: MdxAssetEditingSessionState) => void;
}>;

const localJournal = createMdxAssetUndoJournal();
const localEntries = new Map<string, LocalEntry>();
const pendingRemoteRequests = new Map<
  string,
  {
    entryId: string;
    epoch: string;
    resolve: (result: StorageHistoryExecutionResult) => void;
  }
>();
const realmEpoch = nanoid();
let canvasEpoch: string | undefined;

const getRealm = (): MdxHistoryOwner =>
  typeof window !== "undefined" && window.self !== window.top
    ? "canvas"
    : "builder";

const getProjectUndoEntryId = () =>
  serverSyncStore.transactionManager.currentStack.at(-1)?.id;
const getProjectRedoEntryId = () =>
  serverSyncStore.transactionManager.undoneStack.at(-1)?.id;

export const $builderHistoryAvailability = atom({
  canUndo: false,
  canRedo: false,
});

const publishMessage = (message: MdxHistoryMessage) => {
  $publisher.get().publish?.({ type: "mdxHistory", payload: message });
};

const publishRecordedEntry = (entryId: string) => {
  const metadata = {
    entryId,
    owner: getRealm(),
    projectHistoryAnchorId: getProjectUndoEntryId(),
  } satisfies MdxHistoryMetadata;
  if (metadata.owner === "builder") {
    coordinator.recordStorage(metadata);
  } else {
    publishMessage({ type: "record", entry: metadata, epoch: realmEpoch });
  }
};

const orderedLocalRecords = createOrderedStorageHistoryRecords<
  Readonly<{
    entry: Parameters<typeof localJournal.record>[0];
    localEntry: LocalEntry;
  }>
>({
  commit: (id, record) => {
    const { discardedEntryIds } = localJournal.record(record.entry);
    for (const entryId of discardedEntryIds) {
      localEntries.delete(entryId);
    }
    localEntries.set(id, record.localEntry);
    publishRecordedEntry(id);
  },
});

const getBlockedMessage = (
  reason:
    | "in-flight"
    | "unresolved-write"
    | "source-mismatch"
    | "identity-mismatch"
    | "unauthorized"
    | "session-unavailable"
    | "atomic-persistence-unavailable"
) => {
  if (reason === "atomic-persistence-unavailable") {
    return "This history entry requires atomic persistence.";
  }
  if (reason === "in-flight") {
    return "The MDX file is still being saved. Try again when saving finishes.";
  }
  if (reason === "unauthorized") {
    return "The MDX file is not authorized for editing.";
  }
  if (reason === "source-mismatch" || reason === "identity-mismatch") {
    return "The MDX source changed after this history entry was created.";
  }
  if (reason === "session-unavailable") {
    return "The MDX editing session is no longer available.";
  }
  return "The MDX file has an unresolved save or conflict.";
};

const executeLocalStorage = async ({
  direction,
  entryId,
}: {
  direction: "undo" | "redo";
  entryId: string;
}): Promise<StorageHistoryExecutionResult> => {
  const nextEntryId =
    direction === "undo"
      ? localJournal.nextUndoEntryId
      : localJournal.nextRedoEntryId;
  if (nextEntryId !== entryId) {
    return {
      status: "blocked",
      message: "The MDX history changed before the command was applied.",
    };
  }
  const result = await localJournal[direction]();
  const localEntry = localEntries.get(entryId);
  if (result.status === "blocked") {
    const current = localEntry?.session.get(localEntry.key);
    if (current !== undefined) {
      localEntry?.publishState(current);
    }
    return {
      status: "blocked",
      message: getBlockedMessage(
        result.blockers[0]?.reason ?? "session-unavailable"
      ),
    };
  }
  if (result.status === "noop") {
    return result;
  }
  for (const state of result.storageStates) {
    localEntry?.publishState(state);
  }
  return { status: "applied" };
};

const executeRemoteStorage = ({
  direction,
  entry,
}: {
  direction: "undo" | "redo";
  entry: MdxHistoryMetadata;
}) => {
  if ($publisher.get().publish === undefined) {
    return Promise.resolve<StorageHistoryExecutionResult>({
      status: "blocked",
      message: "The Canvas MDX editing session is unavailable.",
    });
  }
  const epoch = canvasEpoch;
  if (epoch === undefined) {
    return Promise.resolve<StorageHistoryExecutionResult>({
      status: "blocked",
      message: "The Canvas MDX editing session is unavailable.",
    });
  }
  const requestId = nanoid();
  return new Promise<StorageHistoryExecutionResult>((resolve) => {
    pendingRemoteRequests.set(requestId, {
      entryId: entry.entryId,
      epoch,
      resolve,
    });
    publishMessage({
      type: "request",
      requestId,
      owner: entry.owner,
      direction,
      entryId: entry.entryId,
      epoch,
    });
  });
};

const coordinator = createBuilderHistoryCoordinator({
  projectHistory: {
    getUndoEntryId: getProjectUndoEntryId,
    getRedoEntryId: getProjectRedoEntryId,
    undo: () => serverSyncStore.undo(),
    redo: () => serverSyncStore.redo(),
    discardRedo: () => {
      serverSyncStore.transactionManager.undoneStack.length = 0;
    },
    hasUndoEntryId: (entryId) =>
      serverSyncStore.transactionManager.currentStack.some(
        ({ id }) => id === entryId
      ),
  },
  executeStorage: ({ direction, entry }) =>
    entry.owner === "builder"
      ? executeLocalStorage({ direction, entryId: entry.entryId })
      : executeRemoteStorage({ direction, entry }),
  onAvailabilityChange: (availability) =>
    $builderHistoryAvailability.set(availability),
  onEntriesEvicted: (entries) => {
    const builderEntryIds = entries
      .filter(({ owner }) => owner === "builder")
      .map(({ entryId }) => entryId);
    for (const entryId of localJournal.discardEntries(builderEntryIds)) {
      localEntries.delete(entryId);
    }
    const canvasEntryIds = entries
      .filter(({ owner }) => owner === "canvas")
      .map(({ entryId }) => entryId);
    if (canvasEntryIds.length > 0 && canvasEpoch !== undefined) {
      publishMessage({
        type: "discard-entries",
        owner: "canvas",
        entryIds: canvasEntryIds,
        epoch: canvasEpoch,
      });
    }
  },
});

let unsubscribe: (() => void) | undefined;

export const initializeMdxHistoryBridge = () => {
  if (unsubscribe !== undefined) {
    return;
  }
  const realm = getRealm();
  const unsubscribeMessages = subscribe("mdxHistory", (message) => {
    if (realm === "builder") {
      if (message.type === "ready") {
        if (canvasEpoch !== message.epoch) {
          canvasEpoch = message.epoch;
          coordinator.dropOwner("canvas");
          for (const [requestId, request] of pendingRemoteRequests) {
            pendingRemoteRequests.delete(requestId);
            request.resolve({
              status: "blocked",
              message: "The Canvas MDX editing session was reloaded.",
            });
          }
        }
        return;
      }
      if (message.type === "closed") {
        if (canvasEpoch === message.epoch) {
          canvasEpoch = undefined;
          coordinator.dropOwner("canvas");
          for (const [requestId, request] of pendingRemoteRequests) {
            pendingRemoteRequests.delete(requestId);
            request.resolve({
              status: "blocked",
              message: "The Canvas MDX editing session was closed.",
            });
          }
        }
        return;
      }
      if (message.type === "begin") {
        if (message.entry.owner === "canvas" && message.epoch === canvasEpoch) {
          coordinator.beginStorage({
            ...message.entry,
            projectHistoryAnchorId: getProjectUndoEntryId(),
          });
        }
        return;
      }
      if (message.type === "record") {
        if (message.entry.owner === "canvas" && message.epoch === canvasEpoch) {
          coordinator.recordStorage({
            ...message.entry,
            projectHistoryAnchorId: getProjectUndoEntryId(),
          });
        }
        return;
      }
      if (message.type === "drop") {
        if (message.owner !== "canvas" || message.epoch !== canvasEpoch) {
          return;
        }
        coordinator.dropStorage(message.entryIds);
        for (const [requestId, request] of pendingRemoteRequests) {
          if (message.entryIds.includes(request.entryId)) {
            pendingRemoteRequests.delete(requestId);
            request.resolve({
              status: "blocked",
              message: "The MDX editing session was closed.",
            });
          }
        }
        return;
      }
      if (message.type === "project-mutation") {
        if (message.epoch === canvasEpoch) {
          coordinator.notifyProjectMutation();
        }
        return;
      }
      if (message.type === "result") {
        if (message.owner !== "canvas" || message.epoch !== canvasEpoch) {
          return;
        }
        const request = pendingRemoteRequests.get(message.requestId);
        if (
          request !== undefined &&
          request.entryId === message.entryId &&
          request.epoch === message.epoch
        ) {
          pendingRemoteRequests.delete(message.requestId);
          request.resolve(message.result);
        }
      }
      return;
    }
    if (
      message.type === "ready" ||
      message.type === "closed" ||
      message.type === "begin" ||
      message.type === "record" ||
      message.type === "result"
    ) {
      return;
    }
    if (message.owner !== realm) {
      return;
    }
    if (message.type === "request") {
      if (message.epoch !== realmEpoch) {
        return;
      }
      void executeLocalStorage(message).then((result) => {
        publishMessage({
          type: "result",
          requestId: message.requestId,
          owner: realm,
          entryId: message.entryId,
          result,
          epoch: realmEpoch,
        });
      });
      return;
    }
    if (message.type === "discard-redo") {
      for (const entryId of localJournal.discardRedo()) {
        localEntries.delete(entryId);
      }
      return;
    }
    if (message.type === "discard-entries") {
      if (message.epoch !== realmEpoch) {
        return;
      }
      for (const entryId of localJournal.discardEntries(message.entryIds)) {
        localEntries.delete(entryId);
      }
      return;
    }
    if (message.type === "reset") {
      for (const entryId of localJournal.clear()) {
        localEntries.delete(entryId);
      }
      orderedLocalRecords.reset();
    }
  });
  const unsubscribeProjectHistory =
    realm === "builder"
      ? (() => {
          let currentCount =
            serverSyncStore.transactionManager.currentStack.length;
          let redoCount = serverSyncStore.transactionManager.undoneStack.length;
          let redoEntryId = getProjectRedoEntryId();
          return serverSyncStore.subscribe(
            (transactionId, _payload, source) => {
              const nextCurrentCount =
                serverSyncStore.transactionManager.currentStack.length;
              const nextRedoCount =
                serverSyncStore.transactionManager.undoneStack.length;
              const nextRedoEntryId = getProjectRedoEntryId();
              const isTraversal = isProjectHistoryTraversal({
                transactionId,
                currentCount,
                redoCount,
                redoEntryId,
                nextCurrentCount,
                nextRedoCount,
                nextRedoEntryId,
              });
              currentCount = nextCurrentCount;
              redoCount = nextRedoCount;
              redoEntryId = nextRedoEntryId;
              if (source === "remote" || isTraversal === false) {
                notifyProjectHistoryMutation();
              } else {
                coordinator.notifyProjectTraversal();
              }
            }
          );
        })()
      : undefined;
  unsubscribe = () => {
    unsubscribeMessages();
    unsubscribeProjectHistory?.();
  };
  if (realm === "canvas") {
    publishMessage({ type: "ready", owner: "canvas", epoch: realmEpoch });
    window.addEventListener(
      "pagehide",
      () =>
        publishMessage({
          type: "closed",
          owner: "canvas",
          epoch: realmEpoch,
        }),
      { once: true }
    );
  }
};

export const recordMdxAssetHistory = ({
  id = nanoid(),
  state,
  mutation,
  session,
  key,
  beforeSource,
  afterSource,
  publishState,
  isCurrent,
}: {
  id?: string;
  state: Parameters<typeof createMdxAssetUndoEntry>[0]["state"];
  mutation: Pick<BuilderRuntimeMutation, "payload">;
  session: EditingSession;
  key: string;
  beforeSource: string;
  afterSource: string;
  publishState: LocalEntry["publishState"];
  isCurrent?: () => boolean;
}) => {
  const blocker = getMdxHistoryRecordBlocker({
    hasProjectPayload: mutation.payload.some(
      ({ patches }) => patches.length > 0
    ),
    storageRootCount: 1,
  });
  if (blocker !== undefined) {
    dropMdxAssetHistory(id);
    return { status: "blocked" as const, message: blocker };
  }
  if (beforeSource === afterSource) {
    dropMdxAssetHistory(id);
    return { status: "noop" as const };
  }
  initializeMdxHistoryBridge();
  const entry = createMdxAssetUndoEntry({
    id,
    state,
    mutation,
    storage: [{ session, key, beforeSource, afterSource, isCurrent }],
  });
  orderedLocalRecords.complete(id, {
    entry,
    localEntry: { session, key, publishState },
  });
  return { status: "applied" as const, entryId: id };
};

export const beginMdxAssetHistory = (id = nanoid()) => {
  initializeMdxHistoryBridge();
  orderedLocalRecords.begin(id);
  const metadata = {
    entryId: id,
    owner: getRealm(),
    projectHistoryAnchorId: getProjectUndoEntryId(),
  } satisfies MdxHistoryMetadata;
  if (metadata.owner === "builder") {
    coordinator.beginStorage(metadata);
  } else {
    publishMessage({ type: "begin", entry: metadata, epoch: realmEpoch });
  }
  return id;
};

export const dropMdxAssetHistory = (entryId: string) => {
  orderedLocalRecords.drop(entryId);
  localEntries.delete(entryId);
  if (getRealm() === "builder") {
    coordinator.dropStorage([entryId]);
  } else {
    publishMessage({
      type: "drop",
      owner: "canvas",
      entryIds: [entryId],
      epoch: realmEpoch,
    });
  }
};

export const disposeMdxAssetHistory = (session: EditingSession) => {
  const entryIds = localJournal.disposeSession(session);
  for (const entryId of entryIds) {
    localEntries.delete(entryId);
  }
  if (entryIds.length === 0) {
    return;
  }
  if (getRealm() === "builder") {
    coordinator.dropStorage(entryIds);
  } else {
    publishMessage({
      type: "drop",
      owner: "canvas",
      entryIds,
      epoch: realmEpoch,
    });
  }
};

export const notifyProjectHistoryMutation = () => {
  for (const entryId of localJournal.discardRedo()) {
    localEntries.delete(entryId);
  }
  if (getRealm() === "canvas") {
    publishMessage({
      type: "project-mutation",
      owner: "canvas",
      epoch: realmEpoch,
    });
    return;
  }
  coordinator.notifyProjectMutation();
  publishMessage({ type: "discard-redo", owner: "canvas" });
};

export const undoBuilderHistory = () => coordinator.undo();
export const redoBuilderHistory = () => coordinator.redo();

export const resetBuilderMdxHistory = () => {
  coordinator.reset();
  for (const [requestId, request] of pendingRemoteRequests) {
    request.resolve({
      status: "blocked",
      message: "The Builder history was reset.",
    });
    pendingRemoteRequests.delete(requestId);
  }
  for (const entryId of localJournal.clear()) {
    localEntries.delete(entryId);
  }
  orderedLocalRecords.reset();
  publishMessage({ type: "reset", owner: "canvas" });
};
