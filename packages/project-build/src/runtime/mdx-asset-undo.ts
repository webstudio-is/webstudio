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
          | "session-unavailable";
        currentSource?: string;
        error?: Error;
      }>[];
    }>
  | Readonly<{
      status: "applied";
      entryId: string;
      projectPayload: readonly BuilderPatchChange[];
      storageStates: readonly MdxAssetEditingSessionState[];
      persistence:
        | "project-only"
        | "single-root"
        | "requires-multi-root-coordinator";
    }>;

const getSources = (
  snapshot: MdxAssetUndoStorageSnapshot,
  direction: UndoDirection
) =>
  direction === "undo"
    ? { expectedSource: snapshot.afterSource, source: snapshot.beforeSource }
    : { expectedSource: snapshot.beforeSource, source: snapshot.afterSource };

const getPersistence = (
  storageCount: number
): Extract<MdxAssetUndoResult, { status: "applied" }>["persistence"] => {
  if (storageCount === 0) {
    return "project-only";
  }
  if (storageCount === 1) {
    return "single-root";
  }
  return "requires-multi-root-coordinator";
};

export const createMdxAssetUndoJournal = () => {
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
    const blockers: Extract<
      MdxAssetUndoResult,
      { status: "blocked" }
    >["blockers"][number][] = [];
    const preparedRestores: Array<
      Extract<
        Awaited<ReturnType<MdxAssetSourceController["prepareSourceRestore"]>>,
        { status: "ready" }
      >
    > = [];
    for (const snapshot of entry.storage) {
      const sources = getSources(snapshot, direction);
      try {
        const prepared = await snapshot.session.prepareSourceRestore({
          key: snapshot.key,
          ...sources,
        });
        if (prepared.status === "blocked") {
          blockers.push({
            key: snapshot.key,
            reason: prepared.reason,
            currentSource: prepared.currentSource,
          });
        } else {
          preparedRestores.push(prepared);
        }
      } catch (error) {
        blockers.push({
          key: snapshot.key,
          reason: "session-unavailable",
          error:
            error instanceof Error ? error : new Error("Session unavailable"),
        });
      }
    }
    if (blockers.length > 0) {
      return { status: "blocked", entryId: entry.id, blockers };
    }

    // Preparing a restore parses and materializes MDX asynchronously. A session
    // may be disposed or a newer edit may be recorded while that work runs.
    // In that case the original user action is no longer the top history entry.
    if (source.at(-1) !== entry) {
      return { status: "noop" };
    }

    for (let index = 0; index < entry.storage.length; index += 1) {
      const snapshot = entry.storage[index];
      const preflight = preparedRestores[index].canApply();
      if (preflight.status === "blocked") {
        blockers.push({
          key: snapshot.key,
          reason: preflight.reason,
          currentSource: preflight.currentSource,
        });
      }
    }
    if (blockers.length > 0) {
      return { status: "blocked", entryId: entry.id, blockers };
    }
    const storageStates = preparedRestores.map(
      ({ apply }) => apply({ schedule: entry.storage.length === 1 }).state
    );
    source.pop();
    destination.push(entry);
    return {
      status: "applied",
      entryId: entry.id,
      projectPayload:
        direction === "undo" ? entry.project.undo : entry.project.redo,
      storageStates,
      persistence: getPersistence(entry.storage.length),
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
      undoEntries.push(entry);
      redoEntries.length = 0;
    },
    undo: () => enqueue(() => apply("undo")),
    redo: () => enqueue(() => apply("redo")),
    disposeSession: (session: MdxAssetSourceController) => {
      const removeSessionEntries = (entries: MdxAssetUndoEntry[]) => {
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          if (entries[index].storage.some((item) => item.session === session)) {
            entries.splice(index, 1);
          }
        }
      };
      removeSessionEntries(undoEntries);
      removeSessionEntries(redoEntries);
    },
    get canUndo() {
      return undoEntries.length > 0;
    },
    get canRedo() {
      return redoEntries.length > 0;
    },
  };
};
