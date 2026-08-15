import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { createBuilderPatchInversePayload } from "../state/patch";
import type { BuilderRuntimeMutation } from "./mutation";
import type {
  MdxAssetEditingSessionState,
  MdxAssetSourceController,
} from "./mdx-asset-session";

export type MdxAssetUndoStorageSnapshot = Readonly<{
  session: MdxAssetSourceController;
  key: string;
  beforeSource: string;
  afterSource: string;
  isCurrent?: () => boolean;
}>;

export type MdxAssetUndoEntry = Readonly<{
  id: string;
  project: Readonly<{
    undo: readonly BuilderPatchChange[];
    redo: readonly BuilderPatchChange[];
  }>;
  storage: readonly MdxAssetUndoStorageSnapshot[];
}>;

const clonePayload = (payload: readonly BuilderPatchChange[]) =>
  structuredClone(payload) as BuilderPatchChange[];

export const createMdxAssetUndoEntry = ({
  id,
  state,
  mutation,
  storage,
}: {
  id: string;
  state: BuilderState;
  mutation: Pick<BuilderRuntimeMutation, "payload">;
  storage: readonly MdxAssetUndoStorageSnapshot[];
}): MdxAssetUndoEntry => {
  for (let index = 0; index < storage.length; index += 1) {
    const snapshot = storage[index];
    if (
      storage
        .slice(0, index)
        .some(
          (candidate) =>
            candidate.session === snapshot.session &&
            candidate.key === snapshot.key
        )
    ) {
      throw new Error("Duplicate MDX Asset undo storage root");
    }
  }
  return {
    id,
    project: {
      undo: clonePayload(
        createBuilderPatchInversePayload({
          state,
          payload: mutation.payload,
        })
      ),
      redo: clonePayload(mutation.payload),
    },
    storage: storage.map((snapshot) => ({ ...snapshot })),
  };
};

type UndoDirection = "undo" | "redo";

export type MdxAssetUndoResult =
  | Readonly<{ status: "noop" }>
  | Readonly<{
      status: "blocked";
      entryId: string;
      blockers: readonly Readonly<{
        key: string;
        reason:
          | "in-flight"
          | "unresolved-write"
          | "source-mismatch"
          | "identity-mismatch"
          | "unauthorized"
          | "session-unavailable"
          | "atomic-persistence-unavailable";
        currentSource?: string;
        error?: Error;
      }>[];
    }>
  | Readonly<{
      status: "applied";
      entryId: string;
      projectPayload: readonly BuilderPatchChange[];
      storageStates: readonly MdxAssetEditingSessionState[];
      persistence: "project-only" | "single-root";
    }>;

const getSources = (
  snapshot: MdxAssetUndoStorageSnapshot,
  direction: UndoDirection
) =>
  direction === "undo"
    ? { expectedSource: snapshot.afterSource, source: snapshot.beforeSource }
    : { expectedSource: snapshot.beforeSource, source: snapshot.afterSource };

export const createMdxAssetUndoJournal = () => {
  const maxEntries = 100;
  const undoEntries: MdxAssetUndoEntry[] = [];
  const redoEntries: MdxAssetUndoEntry[] = [];
  let pendingOperation: Promise<void> = Promise.resolve();

  const apply = async (
    direction: UndoDirection
  ): Promise<MdxAssetUndoResult> => {
    const source = direction === "undo" ? undoEntries : redoEntries;
    const destination = direction === "undo" ? redoEntries : undoEntries;
    const entry = source.at(-1);
    if (entry === undefined) {
      return { status: "noop" };
    }
    if (
      entry.storage.length > 1 ||
      (entry.storage.length > 0 &&
        entry.project.redo.some(({ patches }) => patches.length > 0))
    ) {
      return {
        status: "blocked",
        entryId: entry.id,
        blockers: entry.storage.map(({ key }) => ({
          key,
          reason: "atomic-persistence-unavailable" as const,
        })),
      };
    }
    if (entry.storage.length === 1) {
      const snapshot = entry.storage[0];
      const sources = getSources(snapshot, direction);
      let restored: Awaited<
        ReturnType<MdxAssetSourceController["persistSourceRestore"]>
      >;
      try {
        restored = await snapshot.session.persistSourceRestore({
          key: snapshot.key,
          ...sources,
          isCurrent: () =>
            source.at(-1) === entry && snapshot.isCurrent?.() !== false,
        });
      } catch (error) {
        return {
          status: "blocked",
          entryId: entry.id,
          blockers: [
            {
              key: snapshot.key,
              reason: "session-unavailable",
              error:
                error instanceof Error
                  ? error
                  : new Error("Session unavailable"),
            },
          ],
        };
      }
      if (restored.status === "blocked") {
        if (source.at(-1) !== entry) {
          return { status: "noop" };
        }
        return {
          status: "blocked",
          entryId: entry.id,
          blockers: [
            {
              key: snapshot.key,
              reason: restored.reason,
              currentSource: restored.currentSource,
            },
          ],
        };
      }
      if (source.at(-1) !== entry) {
        return { status: "noop" };
      }
      source.pop();
      destination.push(entry);
      return {
        status: "applied",
        entryId: entry.id,
        projectPayload:
          direction === "undo" ? entry.project.undo : entry.project.redo,
        storageStates: [restored.state],
        persistence: "single-root",
      };
    }
    source.pop();
    destination.push(entry);
    return {
      status: "applied",
      entryId: entry.id,
      projectPayload:
        direction === "undo" ? entry.project.undo : entry.project.redo,
      storageStates: [],
      persistence: "project-only",
    };
  };

  const enqueue = (operation: () => Promise<MdxAssetUndoResult>) => {
    const result = pendingOperation.then(operation, operation);
    pendingOperation = result.then(
      () => {},
      () => {}
    );
    return result;
  };

  return {
    record: (entry: MdxAssetUndoEntry) => {
      if (
        undoEntries.some(({ id }) => id === entry.id) ||
        redoEntries.some(({ id }) => id === entry.id)
      ) {
        return { discardedEntryIds: [] };
      }
      const discardedEntryIds = redoEntries.map(({ id }) => id);
      undoEntries.push(entry);
      redoEntries.length = 0;
      if (undoEntries.length > maxEntries) {
        discardedEntryIds.push(undoEntries.shift()!.id);
      }
      return { discardedEntryIds };
    },
    undo: () => enqueue(() => apply("undo")),
    redo: () => enqueue(() => apply("redo")),
    disposeSession: (session: MdxAssetSourceController) => {
      const discardedEntryIds: string[] = [];
      const removeSessionEntries = (entries: MdxAssetUndoEntry[]) => {
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          if (entries[index].storage.some((item) => item.session === session)) {
            discardedEntryIds.push(entries[index].id);
            entries.splice(index, 1);
          }
        }
      };
      removeSessionEntries(undoEntries);
      removeSessionEntries(redoEntries);
      return discardedEntryIds;
    },
    discardRedo: () => {
      const entryIds = redoEntries.map(({ id }) => id);
      redoEntries.length = 0;
      return entryIds;
    },
    discardEntries: (entryIds: readonly string[]) => {
      const ids = new Set(entryIds);
      const discardedEntryIds: string[] = [];
      for (const entries of [undoEntries, redoEntries]) {
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          if (ids.has(entries[index].id)) {
            discardedEntryIds.push(entries[index].id);
            entries.splice(index, 1);
          }
        }
      }
      return discardedEntryIds;
    },
    clear: () => {
      const entryIds = [...undoEntries, ...redoEntries].map(({ id }) => id);
      undoEntries.length = 0;
      redoEntries.length = 0;
      return entryIds;
    },
    get nextUndoEntryId() {
      return undoEntries.at(-1)?.id;
    },
    get nextRedoEntryId() {
      return redoEntries.at(-1)?.id;
    },
    get canUndo() {
      return undoEntries.length > 0;
    },
    get canRedo() {
      return redoEntries.length > 0;
    },
  };
};
