export type MdxHistoryOwner = "builder" | "canvas";

export type MdxHistoryMetadata = Readonly<{
  entryId: string;
  owner: MdxHistoryOwner;
  projectHistoryAnchorId: string | undefined;
}>;

type ProjectHistory = Readonly<{
  getUndoEntryId: () => string | undefined;
  getRedoEntryId: () => string | undefined;
  undo: () => void;
  redo: () => void;
  discardRedo: () => void;
  hasUndoEntryId: (entryId: string) => boolean;
}>;

export type StorageHistoryExecutionResult =
  | Readonly<{ status: "applied" | "noop" }>
  | Readonly<{ status: "blocked"; message: string }>;

type StorageHistoryExecutor = (input: {
  direction: "undo" | "redo";
  entry: MdxHistoryMetadata;
}) => Promise<StorageHistoryExecutionResult>;

export const isProjectHistoryTraversal = ({
  transactionId,
  currentCount,
  redoCount,
  redoEntryId,
  nextCurrentCount,
  nextRedoCount,
  nextRedoEntryId,
}: {
  transactionId: string;
  currentCount: number;
  redoCount: number;
  redoEntryId: string | undefined;
  nextCurrentCount: number;
  nextRedoCount: number;
  nextRedoEntryId: string | undefined;
}) =>
  (nextCurrentCount === currentCount - 1 &&
    nextRedoCount === redoCount + 1 &&
    nextRedoEntryId === transactionId) ||
  (nextCurrentCount === currentCount + 1 &&
    nextRedoCount === redoCount - 1 &&
    redoEntryId === transactionId);

export const getMdxHistoryRecordBlocker = ({
  hasProjectPayload,
  storageRootCount,
}: {
  hasProjectPayload: boolean;
  storageRootCount: number;
}) => {
  if (hasProjectPayload) {
    return "Project and MDX history requires atomic persistence.";
  }
  if (storageRootCount !== 1) {
    return "Multi-Asset history requires atomic persistence.";
  }
};

export const createOrderedStorageHistoryRecords = <Value>({
  commit,
}: {
  commit: (id: string, value: Value) => void;
}) => {
  const records: Array<{
    id: string;
    value?: Value;
    dropped?: boolean;
  }> = [];
  const drain = () => {
    while (records.length > 0) {
      const record = records[0];
      if (record.dropped) {
        records.shift();
        continue;
      }
      if (record.value === undefined) {
        return;
      }
      records.shift();
      commit(record.id, record.value);
    }
  };
  return {
    begin: (id: string) => {
      if (records.some((record) => record.id === id) === false) {
        records.push({ id });
      }
    },
    complete: (id: string, value: Value) => {
      const record = records.find((candidate) => candidate.id === id);
      if (record === undefined) {
        records.push({ id, value });
      } else {
        record.value = value;
      }
      drain();
    },
    drop: (id: string) => {
      const record = records.find((candidate) => candidate.id === id);
      if (record !== undefined) {
        record.dropped = true;
        drain();
      }
    },
    reset: () => {
      records.length = 0;
    },
  };
};

export const createBuilderHistoryCoordinator = ({
  projectHistory,
  executeStorage,
  onAvailabilityChange,
  onEntriesEvicted,
}: {
  projectHistory: ProjectHistory;
  executeStorage: StorageHistoryExecutor;
  onAvailabilityChange?: (availability: {
    canUndo: boolean;
    canRedo: boolean;
  }) => void;
  onEntriesEvicted?: (entries: readonly MdxHistoryMetadata[]) => void;
}) => {
  const undoEntries: MdxHistoryMetadata[] = [];
  const redoEntries: MdxHistoryMetadata[] = [];
  const pendingEntryIds = new Set<string>();
  let pending = Promise.resolve<StorageHistoryExecutionResult>({
    status: "noop",
  });

  const getAvailability = () => ({
    canUndo:
      projectHistory.getUndoEntryId() !== undefined || undoEntries.length > 0,
    canRedo:
      projectHistory.getRedoEntryId() !== undefined || redoEntries.length > 0,
  });
  const notifyAvailability = () => onAvailabilityChange?.(getAvailability());
  const removeEntries = (entryIds: readonly string[]) => {
    const ids = new Set(entryIds);
    for (const entries of [undoEntries, redoEntries]) {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (ids.has(entries[index].entryId)) {
          pendingEntryIds.delete(entries[index].entryId);
          entries.splice(index, 1);
        }
      }
    }
  };
  const pruneStaleUndoEntries = () => {
    const evicted: MdxHistoryMetadata[] = [];
    for (let index = undoEntries.length - 1; index >= 0; index -= 1) {
      const anchor = undoEntries[index].projectHistoryAnchorId;
      if (
        pendingEntryIds.has(undoEntries[index].entryId) === false &&
        anchor !== undefined &&
        projectHistory.hasUndoEntryId(anchor) === false
      ) {
        pendingEntryIds.delete(undoEntries[index].entryId);
        evicted.push(...undoEntries.splice(index, 1));
      }
    }
    if (evicted.length > 0) {
      onEntriesEvicted?.(evicted);
    }
  };

  const apply = async (
    direction: "undo" | "redo"
  ): Promise<StorageHistoryExecutionResult> => {
    if (pendingEntryIds.size > 0) {
      return {
        status: "blocked",
        message: "The MDX history entry is still being prepared.",
      };
    }
    const source = direction === "undo" ? undoEntries : redoEntries;
    const destination = direction === "undo" ? redoEntries : undoEntries;
    const storageEntry = source.at(-1);
    const projectEntryId =
      direction === "undo"
        ? projectHistory.getUndoEntryId()
        : projectHistory.getRedoEntryId();
    const currentProjectEntryId = projectHistory.getUndoEntryId();
    if (
      storageEntry !== undefined &&
      storageEntry.projectHistoryAnchorId === currentProjectEntryId
    ) {
      const result = await executeStorage({ direction, entry: storageEntry });
      if (result.status === "applied") {
        if (source.at(-1) !== storageEntry) {
          notifyAvailability();
          return { status: "noop" };
        }
        source.pop();
        destination.push(storageEntry);
      }
      notifyAvailability();
      return result;
    }
    if (projectEntryId !== undefined) {
      if (direction === "undo") {
        projectHistory.undo();
      } else {
        projectHistory.redo();
      }
      notifyAvailability();
      return { status: "applied" };
    }
    if (storageEntry !== undefined) {
      return {
        status: "blocked",
        message: "The MDX history no longer matches the project history.",
      };
    }
    return { status: "noop" };
  };

  const enqueue = (direction: "undo" | "redo") => {
    const result = pending.then(
      () => apply(direction),
      () => apply(direction)
    );
    pending = result;
    return result;
  };

  return {
    beginStorage: (entry: MdxHistoryMetadata) => {
      if (
        undoEntries.some(({ entryId }) => entryId === entry.entryId) ||
        redoEntries.some(({ entryId }) => entryId === entry.entryId)
      ) {
        return;
      }
      undoEntries.push(entry);
      pendingEntryIds.add(entry.entryId);
      notifyAvailability();
    },
    recordStorage: (entry: MdxHistoryMetadata) => {
      if (
        pendingEntryIds.delete(entry.entryId) === false &&
        undoEntries.some(({ entryId }) => entryId === entry.entryId) ===
          false &&
        redoEntries.some(({ entryId }) => entryId === entry.entryId) === false
      ) {
        undoEntries.push(entry);
      }
      if (undoEntries.length > 100) {
        const evictedIndex = undoEntries.findIndex(
          ({ entryId }) => pendingEntryIds.has(entryId) === false
        );
        if (evictedIndex !== -1) {
          onEntriesEvicted?.(undoEntries.splice(evictedIndex, 1));
        }
      }
      pruneStaleUndoEntries();
      redoEntries.length = 0;
      projectHistory.discardRedo();
      notifyAvailability();
    },
    dropStorage: (entryIds: readonly string[]) => {
      removeEntries(entryIds);
      notifyAvailability();
    },
    dropOwner: (owner: MdxHistoryOwner) => {
      const entryIds = [...undoEntries, ...redoEntries]
        .filter((entry) => entry.owner === owner)
        .map(({ entryId }) => entryId);
      removeEntries(entryIds);
      notifyAvailability();
      return entryIds;
    },
    notifyProjectMutation: () => {
      redoEntries.length = 0;
      pruneStaleUndoEntries();
      notifyAvailability();
    },
    notifyProjectTraversal: notifyAvailability,
    undo: () => enqueue("undo"),
    redo: () => enqueue("redo"),
    reset: () => {
      undoEntries.length = 0;
      redoEntries.length = 0;
      pendingEntryIds.clear();
      notifyAvailability();
    },
    get availability() {
      return getAvailability();
    },
  };
};
