import { describe, expect, test } from "vitest";
import {
  createBuilderHistoryCoordinator,
  createOrderedStorageHistoryRecords,
  getMdxHistoryRecordBlocker,
  isProjectHistoryTraversal,
} from "./content-block-history";

test("commits completed storage records in user-action order", () => {
  const committed: string[] = [];
  const records = createOrderedStorageHistoryRecords<string>({
    commit: (id, value) => committed.push(`${id}:${value}`),
  });
  records.begin("first");
  records.begin("second");

  records.complete("second", "Second");
  expect(committed).toEqual([]);
  records.complete("first", "First");

  expect(committed).toEqual(["first:First", "second:Second"]);
});

test("unblocks later storage records when an earlier edit is dropped", () => {
  const committed: string[] = [];
  const records = createOrderedStorageHistoryRecords<string>({
    commit: (id) => committed.push(id),
  });
  records.begin("failed");
  records.begin("saved");
  records.complete("saved", "Saved");

  records.drop("failed");

  expect(committed).toEqual(["saved"]);
});

test("distinguishes project undo and redo from new transactions", () => {
  expect(
    isProjectHistoryTraversal({
      transactionId: "project-2",
      currentCount: 2,
      redoCount: 0,
      redoEntryId: undefined,
      nextCurrentCount: 1,
      nextRedoCount: 1,
      nextRedoEntryId: "project-2",
    })
  ).toBe(true);
  expect(
    isProjectHistoryTraversal({
      transactionId: "project-2",
      currentCount: 1,
      redoCount: 1,
      redoEntryId: "project-2",
      nextCurrentCount: 2,
      nextRedoCount: 0,
      nextRedoEntryId: undefined,
    })
  ).toBe(true);
  expect(
    isProjectHistoryTraversal({
      transactionId: "project-101",
      currentCount: 100,
      redoCount: 0,
      redoEntryId: undefined,
      nextCurrentCount: 100,
      nextRedoCount: 0,
      nextRedoEntryId: undefined,
    })
  ).toBe(false);
  expect(
    isProjectHistoryTraversal({
      transactionId: "new-project",
      currentCount: 1,
      redoCount: 1,
      redoEntryId: "project-2",
      nextCurrentCount: 2,
      nextRedoCount: 0,
      nextRedoEntryId: undefined,
    })
  ).toBe(false);
});

const createProjectHistory = (initial: string[] = []) => {
  const undo = [...initial];
  const redo: string[] = [];
  return {
    adapter: {
      getUndoEntryId: () => undo.at(-1),
      getRedoEntryId: () => redo.at(-1),
      undo: () => {
        const entry = undo.pop();
        if (entry !== undefined) {
          redo.push(entry);
        }
      },
      redo: () => {
        const entry = redo.pop();
        if (entry !== undefined) {
          undo.push(entry);
        }
      },
      discardRedo: () => {
        redo.length = 0;
      },
      hasUndoEntryId: (entryId: string) => undo.includes(entryId),
    },
    push: (id: string) => {
      undo.push(id);
      redo.length = 0;
    },
    evictOldest: () => undo.shift(),
    get undo() {
      return [...undo];
    },
    get redo() {
      return [...redo];
    },
  };
};

describe("Builder MDX history coordinator", () => {
  test("preserves project and storage chronology across undo and redo", async () => {
    const project = createProjectHistory(["project-1"]);
    const storageDirections: string[] = [];
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async ({ direction }) => {
        storageDirections.push(direction);
        return { status: "applied" };
      },
    });
    coordinator.recordStorage({
      entryId: "storage-1",
      owner: "canvas",
      projectHistoryAnchorId: "project-1",
    });
    project.push("project-2");
    coordinator.notifyProjectMutation();

    await coordinator.undo();
    expect(project.undo).toEqual(["project-1"]);
    expect(storageDirections).toEqual([]);
    await coordinator.undo();
    expect(storageDirections).toEqual(["undo"]);

    await coordinator.redo();
    await coordinator.redo();
    expect(storageDirections).toEqual(["undo", "redo"]);
    expect(project.undo).toEqual(["project-1", "project-2"]);
  });

  test("does not advance storage metadata when persistence is blocked", async () => {
    const project = createProjectHistory();
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async () => ({
        status: "blocked",
        message: "The MDX file changed remotely.",
      }),
    });
    coordinator.recordStorage({
      entryId: "storage",
      owner: "canvas",
      projectHistoryAnchorId: undefined,
    });

    expect(await coordinator.undo()).toEqual({
      status: "blocked",
      message: "The MDX file changed remotely.",
    });
    expect(coordinator.availability).toEqual({
      canUndo: true,
      canRedo: false,
    });
  });

  test("ignores duplicated storage messages", async () => {
    const project = createProjectHistory();
    const executed: string[] = [];
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async ({ entry }) => {
        executed.push(entry.entryId);
        return { status: "applied" };
      },
    });
    const entry = {
      entryId: "storage",
      owner: "canvas" as const,
      projectHistoryAnchorId: undefined,
    };
    coordinator.beginStorage(entry);
    coordinator.beginStorage(entry);
    coordinator.recordStorage(entry);
    coordinator.recordStorage(entry);

    expect((await coordinator.undo()).status).toBe("applied");
    expect(await coordinator.undo()).toEqual({ status: "noop" });
    expect(executed).toEqual(["storage"]);
  });

  test("blocks project undo while a newer storage entry is preparing", async () => {
    const project = createProjectHistory(["project"]);
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async () => ({ status: "applied" }),
    });
    const entry = {
      entryId: "pending",
      owner: "canvas" as const,
      projectHistoryAnchorId: "project",
    };
    coordinator.beginStorage(entry);

    expect(await coordinator.undo()).toEqual({
      status: "blocked",
      message: "The MDX history entry is still being prepared.",
    });
    expect(project.undo).toEqual(["project"]);

    coordinator.recordStorage(entry);
    expect((await coordinator.undo()).status).toBe("applied");
  });

  test("preserves redo when a pending storage edit is dropped", async () => {
    const project = createProjectHistory(["project"]);
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async () => ({ status: "applied" }),
    });
    expect((await coordinator.undo()).status).toBe("applied");
    expect(project.redo).toEqual(["project"]);

    coordinator.beginStorage({
      entryId: "failed-save",
      owner: "canvas",
      projectHistoryAnchorId: undefined,
    });
    expect(await coordinator.redo()).toEqual({
      status: "blocked",
      message: "The MDX history entry is still being prepared.",
    });
    coordinator.dropStorage(["failed-save"]);

    expect((await coordinator.redo()).status).toBe("applied");
    expect(project.undo).toEqual(["project"]);
  });

  test("serializes repeated shortcuts and invalidates redo on new history", async () => {
    const project = createProjectHistory();
    let release: () => void = () => {};
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: ({ direction }) =>
        new Promise((resolve) => {
          release = () => resolve({ status: "applied" });
          expect(direction).toBe("undo");
        }),
    });
    coordinator.recordStorage({
      entryId: "storage",
      owner: "canvas",
      projectHistoryAnchorId: undefined,
    });
    const first = coordinator.undo();
    const second = coordinator.undo();
    await Promise.resolve();
    release();
    expect((await first).status).toBe("applied");
    expect(await second).toEqual({ status: "noop" });
    expect(coordinator.availability.canRedo).toBe(true);

    project.push("project");
    coordinator.notifyProjectMutation();
    expect(coordinator.availability.canRedo).toBe(false);
  });

  test("keeps pending records ordered while bounding completed history", async () => {
    const project = createProjectHistory();
    const executed: string[] = [];
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async ({ entry }) => {
        executed.push(entry.entryId);
        return { status: "applied" };
      },
    });
    const entries = Array.from({ length: 101 }, (_, index) => ({
      entryId: `storage-${index}`,
      owner: "canvas" as const,
      projectHistoryAnchorId: undefined,
    }));
    for (const entry of entries) {
      coordinator.beginStorage(entry);
    }
    for (const entry of entries) {
      coordinator.recordStorage(entry);
    }

    expect((await coordinator.undo()).status).toBe("applied");
    expect(executed).toEqual(["storage-100"]);
  });

  test("does not evict a pending entry when other realms fill history", async () => {
    const project = createProjectHistory();
    const executed: string[] = [];
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async ({ entry }) => {
        executed.push(entry.entryId);
        return { status: "applied" };
      },
    });
    coordinator.beginStorage({
      entryId: "pending",
      owner: "canvas",
      projectHistoryAnchorId: undefined,
    });
    for (let index = 0; index < 101; index += 1) {
      coordinator.recordStorage({
        entryId: `builder-${index}`,
        owner: "builder",
        projectHistoryAnchorId: undefined,
      });
    }

    expect(await coordinator.undo()).toEqual({
      status: "blocked",
      message: "The MDX history entry is still being prepared.",
    });
    coordinator.dropStorage(["pending"]);
    expect((await coordinator.undo()).status).toBe("applied");
    expect(executed).toEqual(["builder-100"]);
  });

  test("prunes storage history whose project anchor was evicted", async () => {
    const project = createProjectHistory(["evicted-anchor"]);
    const executed: string[] = [];
    const evicted: string[] = [];
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async ({ entry }) => {
        executed.push(entry.entryId);
        return { status: "applied" };
      },
      onEntriesEvicted: (entries) =>
        evicted.push(...entries.map(({ entryId }) => entryId)),
    });
    coordinator.recordStorage({
      entryId: "stale-storage",
      owner: "canvas",
      projectHistoryAnchorId: "evicted-anchor",
    });
    project.evictOldest();
    project.push("retained-project");
    coordinator.notifyProjectMutation();

    expect((await coordinator.undo()).status).toBe("applied");
    expect(await coordinator.undo()).toEqual({ status: "noop" });
    expect(executed).toEqual([]);
    expect(evicted).toEqual(["stale-storage"]);
  });

  test("drops stale Canvas history without removing Builder entries", async () => {
    const project = createProjectHistory();
    const executed: string[] = [];
    const coordinator = createBuilderHistoryCoordinator({
      projectHistory: project.adapter,
      executeStorage: async ({ entry }) => {
        executed.push(entry.entryId);
        return { status: "applied" };
      },
    });
    coordinator.recordStorage({
      entryId: "builder-entry",
      owner: "builder",
      projectHistoryAnchorId: undefined,
    });
    coordinator.recordStorage({
      entryId: "old-canvas-entry",
      owner: "canvas",
      projectHistoryAnchorId: undefined,
    });

    expect(coordinator.dropOwner("canvas")).toEqual(["old-canvas-entry"]);
    expect((await coordinator.undo()).status).toBe("applied");
    expect(executed).toEqual(["builder-entry"]);
  });

  test("blocks grouped and multi-root storage history before mutation", () => {
    expect(
      getMdxHistoryRecordBlocker({
        hasProjectPayload: true,
        storageRootCount: 1,
      })
    ).toBe("Project and MDX history requires atomic persistence.");
    expect(
      getMdxHistoryRecordBlocker({
        hasProjectPayload: false,
        storageRootCount: 2,
      })
    ).toBe("Multi-Asset history requires atomic persistence.");
    expect(
      getMdxHistoryRecordBlocker({
        hasProjectPayload: false,
        storageRootCount: 1,
      })
    ).toBeUndefined();
  });
});
