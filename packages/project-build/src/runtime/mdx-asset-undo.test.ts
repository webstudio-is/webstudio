import { describe, expect, test } from "vitest";
import { blockComponent, type Instance } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import {
  createMdxAssetUndoEntry,
  createMdxAssetUndoJournal,
} from "./mdx-asset-undo";
import type {
  MdxAssetEditingSessionState,
  MdxAssetSourceController,
} from "./mdx-asset-session";

const identity = {
  blockInstanceId: "block",
  assetId: "asset",
  revision: "sha256:revision",
  contentRef: "post.mdx",
  format: "mdx" as const,
  renderScope: "page:/one",
};

const placeholderState: MdxAssetEditingSessionState = {
  status: "cancelled",
  key: "session",
  identity,
  diagnostics: [],
};

const createSourceController = (
  initialSource: string,
  beforePrepare?: () => Promise<void>
) => {
  let source = initialSource;
  const applyOptions: Array<{ schedule?: boolean } | undefined> = [];
  let blockedReason:
    | "in-flight"
    | "unresolved-write"
    | "source-mismatch"
    | undefined;
  let persistenceBlocked = false;
  const controller: MdxAssetSourceController = {
    canRestoreSource: ({ expectedSource }) => {
      if (blockedReason !== undefined) {
        return {
          status: "blocked",
          state: placeholderState,
          reason: blockedReason,
          currentSource: source,
        };
      }
      if (source !== expectedSource) {
        return {
          status: "blocked",
          state: placeholderState,
          reason: "source-mismatch",
          currentSource: source,
        };
      }
      return { status: "ready", currentSource: source };
    },
    prepareSourceRestore: async ({ expectedSource, source: nextSource }) => {
      await beforePrepare?.();
      const preflight = controller.canRestoreSource({
        key: "session",
        expectedSource,
      });
      if (preflight.status === "blocked") {
        return preflight;
      }
      return {
        status: "ready",
        canApply: () =>
          controller.canRestoreSource({
            key: "session",
            expectedSource,
          }),
        apply: (options) => {
          applyOptions.push(options);
          source = nextSource;
          return { status: "applied", state: placeholderState };
        },
      };
    },
    restoreSource: async ({ expectedSource, source: nextSource }) => {
      const prepared = await controller.prepareSourceRestore({
        key: "session",
        expectedSource,
        source: nextSource,
      });
      if (prepared.status === "blocked") {
        return prepared;
      }
      const preflight = prepared.canApply();
      return preflight.status === "ready" ? prepared.apply() : preflight;
    },
    persistSourceRestore: async ({
      expectedSource,
      source: nextSource,
      isCurrent,
    }) => {
      const prepared = await controller.prepareSourceRestore({
        key: "session",
        expectedSource,
        source: nextSource,
      });
      if (prepared.status === "blocked") {
        return prepared;
      }
      if (isCurrent?.() === false) {
        return {
          status: "blocked",
          state: placeholderState,
          reason: "source-mismatch",
          currentSource: source,
        };
      }
      if (persistenceBlocked) {
        return {
          status: "blocked",
          state: placeholderState,
          reason: "unresolved-write",
          currentSource: source,
        };
      }
      const preflight = prepared.canApply();
      return preflight.status === "ready"
        ? prepared.apply({ schedule: false })
        : preflight;
    },
  };
  return {
    controller,
    get source() {
      return source;
    },
    applyOptions,
    block: (reason: "in-flight" | "unresolved-write" | "source-mismatch") => {
      blockedReason = reason;
    },
    blockPersistence: () => {
      persistenceBlocked = true;
    },
  };
};

const createState = (): BuilderState => ({
  instances: new Map<string, Instance>([
    [
      "instance",
      {
        type: "instance",
        id: "instance",
        component: blockComponent,
        children: [{ type: "text", value: "Before" }],
      },
    ],
  ]),
});

const mutation = {
  payload: [
    {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["instance", "children", 0, "value"],
          value: "After",
        },
      ],
    },
  ],
};

describe("MDX Asset undo journal", () => {
  test("rejects duplicate storage roots before recording history", () => {
    const source = createSourceController("After");
    const snapshot = {
      session: source.controller,
      key: "session",
      beforeSource: "Before",
      afterSource: "After",
    };

    expect(() =>
      createMdxAssetUndoEntry({
        id: "duplicate",
        state: createState(),
        mutation: { payload: [] },
        storage: [snapshot, snapshot],
      })
    ).toThrowError();
  });

  test("rejects grouped project and storage history before restoring", async () => {
    const source = createSourceController("After source");
    const entry = createMdxAssetUndoEntry({
      id: "edit",
      state: createState(),
      mutation,
      storage: [
        {
          session: source.controller,
          key: "session",
          beforeSource: "Before source",
          afterSource: "After source",
        },
      ],
    });
    const journal = createMdxAssetUndoJournal();
    journal.record(entry);

    expect(await journal.undo()).toMatchObject({
      status: "blocked",
      entryId: "edit",
      blockers: [{ reason: "atomic-persistence-unavailable" }],
    });
    expect(source.source).toBe("After source");
    expect(journal.canUndo).toBe(true);
    expect(journal.canRedo).toBe(false);
  });

  test("invalidates redo history when a new mutation is recorded", async () => {
    const source = createSourceController("After");
    const journal = createMdxAssetUndoJournal();
    const createEntry = (id: string) =>
      createMdxAssetUndoEntry({
        id,
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
          },
        ],
      });
    journal.record(createEntry("first"));
    expect((await journal.undo()).status).toBe("applied");

    journal.record(createEntry("replacement"));

    expect(journal.canRedo).toBe(false);
    expect(await journal.redo()).toEqual({ status: "noop" });
  });

  test("ignores a duplicated history entry", async () => {
    const source = createSourceController("After");
    const journal = createMdxAssetUndoJournal();
    const entry = createMdxAssetUndoEntry({
      id: "duplicate-message",
      state: createState(),
      mutation: { payload: [] },
      storage: [
        {
          session: source.controller,
          key: "session",
          beforeSource: "Before",
          afterSource: "After",
        },
      ],
    });
    journal.record(entry);
    journal.record(entry);

    expect((await journal.undo()).status).toBe("applied");
    expect(await journal.undo()).toEqual({ status: "noop" });
  });

  test("exposes the next entries and can discard redo without changing undo", async () => {
    const source = createSourceController("After");
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "edit",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
          },
        ],
      })
    );

    expect(journal.nextUndoEntryId).toBe("edit");
    expect(journal.nextRedoEntryId).toBeUndefined();
    expect((await journal.undo()).status).toBe("applied");
    expect(journal.nextUndoEntryId).toBeUndefined();
    expect(journal.nextRedoEntryId).toBe("edit");

    expect(journal.discardRedo()).toEqual(["edit"]);
    expect(journal.nextRedoEntryId).toBeUndefined();
    expect(journal.canRedo).toBe(false);
  });

  test("rejects multi-root history before changing any session", async () => {
    const first = createSourceController("After one");
    const second = createSourceController("After two");
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "multi",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: first.controller,
            key: "first",
            beforeSource: "Before one",
            afterSource: "After one",
          },
          {
            session: second.controller,
            key: "second",
            beforeSource: "Before two",
            afterSource: "After two",
          },
        ],
      })
    );

    expect(await journal.undo()).toMatchObject({
      status: "blocked",
      entryId: "multi",
      blockers: [
        { key: "first", reason: "atomic-persistence-unavailable" },
        { key: "second", reason: "atomic-persistence-unavailable" },
      ],
    });
    expect(first.source).toBe("After one");
    expect(second.source).toBe("After two");
    expect(journal.canUndo).toBe(true);
    expect(journal.canRedo).toBe(false);
  });

  test("does not advance single-root history when durable persistence fails", async () => {
    const source = createSourceController("After");
    source.blockPersistence();
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "edit",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
          },
        ],
      })
    );

    expect(await journal.undo()).toMatchObject({
      status: "blocked",
      entryId: "edit",
      blockers: [{ reason: "unresolved-write" }],
    });
    expect(source.source).toBe("After");
    expect(journal.nextUndoEntryId).toBe("edit");
    expect(journal.nextRedoEntryId).toBeUndefined();
  });

  test("never prepares independent writes for multi-root undo", async () => {
    const first = createSourceController("After one");
    const second = createSourceController("After two");
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "multi",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: first.controller,
            key: "first",
            beforeSource: "Before one",
            afterSource: "After one",
          },
          {
            session: second.controller,
            key: "second",
            beforeSource: "Before two",
            afterSource: "After two",
          },
        ],
      })
    );

    expect(await journal.undo()).toMatchObject({
      status: "blocked",
      blockers: [
        { reason: "atomic-persistence-unavailable" },
        { reason: "atomic-persistence-unavailable" },
      ],
    });
    expect(first.applyOptions).toEqual([]);
    expect(second.applyOptions).toEqual([]);
  });

  test("drops history owned by a disposed session", async () => {
    const source = createSourceController("After");
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "disposed",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
          },
        ],
      })
    );

    journal.disposeSession(source.controller);
    expect(journal.canUndo).toBe(false);
    expect(await journal.undo()).toEqual({ status: "noop" });
  });

  test("does not revive disposed history while an undo is preparing", async () => {
    let releasePreparation: () => void = () => {};
    const source = createSourceController(
      "After",
      () =>
        new Promise<void>((resolve) => {
          releasePreparation = resolve;
        })
    );
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "disposed",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
          },
        ],
      })
    );

    const undo = journal.undo();
    await Promise.resolve();
    journal.disposeSession(source.controller);
    releasePreparation();

    expect(await undo).toEqual({ status: "noop" });
    expect(source.source).toBe("After");
    expect(journal.canUndo).toBe(false);
    expect(journal.canRedo).toBe(false);
  });

  test("blocks restore after the source binding changes", async () => {
    const source = createSourceController("After");
    const journal = createMdxAssetUndoJournal();
    let isCurrent = true;
    journal.record(
      createMdxAssetUndoEntry({
        id: "changed-binding",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
            isCurrent: () => isCurrent,
          },
        ],
      })
    );

    isCurrent = false;

    expect(await journal.undo()).toMatchObject({
      status: "blocked",
      blockers: [{ reason: "source-mismatch" }],
    });
    expect(source.source).toBe("After");
    expect(journal.canUndo).toBe(true);
    expect(journal.canRedo).toBe(false);
  });

  test("serializes repeated undo requests", async () => {
    const source = createSourceController("After");
    const journal = createMdxAssetUndoJournal();
    journal.record(
      createMdxAssetUndoEntry({
        id: "once",
        state: createState(),
        mutation: { payload: [] },
        storage: [
          {
            session: source.controller,
            key: "session",
            beforeSource: "Before",
            afterSource: "After",
          },
        ],
      })
    );

    const results = await Promise.all([journal.undo(), journal.undo()]);
    expect(results.map(({ status }) => status)).toEqual(["applied", "noop"]);
    expect(source.source).toBe("Before");
    expect(journal.canUndo).toBe(false);
    expect(journal.canRedo).toBe(true);
  });

  test("serializes rapid edits through repeated undo and redo", async () => {
    const source = createSourceController("Second");
    const journal = createMdxAssetUndoJournal();
    for (const [id, beforeSource, afterSource] of [
      ["first", "Before", "First"],
      ["second", "First", "Second"],
    ] as const) {
      journal.record(
        createMdxAssetUndoEntry({
          id,
          state: createState(),
          mutation: { payload: [] },
          storage: [
            {
              session: source.controller,
              key: "session",
              beforeSource,
              afterSource,
            },
          ],
        })
      );
    }

    expect(
      (await Promise.all([journal.undo(), journal.undo()])).map(
        ({ status }) => status
      )
    ).toEqual(["applied", "applied"]);
    expect(source.source).toBe("Before");
    expect(
      (await Promise.all([journal.redo(), journal.redo()])).map(
        ({ status }) => status
      )
    ).toEqual(["applied", "applied"]);
    expect(source.source).toBe("Second");
  });
});
