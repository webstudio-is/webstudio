import { describe, expect, test } from "vitest";
import {
  getAssetContentHash,
  blockComponent,
  blockTemplateComponent,
} from "@webstudio-is/sdk";
import type { AssetRepository } from "@webstudio-is/asset-uploader/server";
import { AssetRevisionConflictError } from "@webstudio-is/asset-uploader/server";
import type { BuilderState } from "../state/builder-state";
import {
  createMdxAssetEditingSession,
  type MdxAssetEditingSessionState,
} from "./mdx-asset-session";

const encoder = new TextEncoder();

const asset = (id: string, name = `${id}_hash.mdx`) => ({
  id,
  projectId: "project",
  size: 0,
  name,
  filename: `${id}.mdx`,
  description: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  type: "file" as const,
  format: "file",
  meta: {},
});

const createRepository = (sources: Map<string, string>) =>
  ({
    readContent: async ({ assetId }: { assetId: string }) => {
      const source = sources.get(assetId);
      if (source === undefined) {
        throw new Error("Asset not found");
      }
      const bytes = encoder.encode(source);
      return {
        asset: { ...asset(assetId), size: bytes.byteLength },
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.byteLength,
      };
    },
  }) satisfies Pick<AssetRepository, "readContent">;

const readStream = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

const createWritableRepository = (initial: Map<string, string>) => {
  const sources = new Map(initial);
  const names = new Map(
    Array.from(initial.keys(), (id) => [id, `${id}_hash.mdx`])
  );
  const updates: Array<{
    assetId: string;
    expectedName: string;
    source: string;
  }> = [];
  let revision = 0;
  const repository = {
    readContent: async ({ assetId }: { assetId: string }) => {
      const source = sources.get(assetId);
      const name = names.get(assetId);
      if (source === undefined || name === undefined) {
        throw new Error("Asset not found");
      }
      const bytes = encoder.encode(source);
      return {
        asset: { ...asset(assetId, name), size: bytes.byteLength },
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.byteLength,
      };
    },
    updateContent: async ({
      assetId,
      expectedName,
      data,
    }: Parameters<AssetRepository["updateContent"]>[0]) => {
      if (names.get(assetId) !== expectedName) {
        throw new AssetRevisionConflictError("Changed remotely");
      }
      const source = await readStream(data);
      revision += 1;
      const name = `${assetId}_revision_${revision}.mdx`;
      names.set(assetId, name);
      sources.set(assetId, source);
      updates.push({ assetId, expectedName, source });
      return {
        ...asset(assetId, name),
        size: encoder.encode(source).byteLength,
      };
    },
  } satisfies Pick<AssetRepository, "readContent" | "updateContent">;
  return { repository, sources, names, updates };
};

const textChange = (
  state: Extract<MdxAssetEditingSessionState, { status: "saved" | "pending" }>,
  value: string
) => ({
  root: { type: "external" as const, identity: state.identity },
  payload: [
    {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: [state.root.fragment.instances[0].id, "children", 0, "value"],
          value,
        },
      ],
    },
  ],
});

const createState = (): BuilderState => ({
  instances: new Map([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [{ type: "id", value: "templates" }],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
  ]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const expectStatus = <Status extends MdxAssetEditingSessionState["status"]>(
  state: MdxAssetEditingSessionState,
  status: Status
) => {
  expect(state.status).toBe(status);
  return state as Extract<MdxAssetEditingSessionState, { status: Status }>;
};

describe("MDX Asset editing session", () => {
  test("loads direct Assets into a revision-pinned materialized root", async () => {
    const source = "# Direct";
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["direct", source]])),
      authorizeAsset: () => true,
    });

    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "direct" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );

    expect(loaded.identity).toEqual({
      blockInstanceId: "block",
      assetId: "direct",
      revision: `sha256:${await getAssetContentHash(encoder.encode(source))}`,
      contentRef: "direct_hash.mdx",
      format: "mdx",
      renderScope: "page:/one",
    });
    expect(loaded.root.fragment.instances[0]).toMatchObject({ tag: "h1" });
  });

  test("resolves a dynamic binding once and isolates render scopes", async () => {
    const sources = new Map([
      ["first", "First"],
      ["second", "Second"],
    ]);
    let resolved = "first";
    let resolutionCount = 0;
    const session = createMdxAssetEditingSession({
      repository: createRepository(sources),
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => {
        resolutionCount += 1;
        return resolved;
      },
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "expression" as const, value: "post.body" },
      state: createState(),
      projectId: "project",
    };

    const first = expectStatus(
      await session.open({ ...input, renderScope: "collection:first" }),
      "saved"
    );
    resolved = "second";
    const second = expectStatus(
      await session.open({ ...input, renderScope: "collection:second" }),
      "saved"
    );

    expect(first.key).not.toBe(second.key);
    expect(first.identity.assetId).toBe("first");
    expect(second.identity.assetId).toBe("second");
    expect(session.get(first.key)).toBe(first);
    expect(session.get(second.key)).toBe(second);
    expect(resolutionCount).toBe(2);
  });

  test("returns a typed failure when dynamic source resolution fails", async () => {
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map()),
      authorizeAsset: () => true,
      resolveExpressionAssetId: () => {
        throw new Error("Unavailable scope");
      },
    });

    const failed = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "expression", value: "post.body" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "failed"
    );
    expect(failed.error.message).toBe("Unavailable scope");
  });

  test("does not re-evaluate a changed dynamic binding while saving", async () => {
    let resolved = "first";
    let resolutionCount = 0;
    const authorized: string[] = [];
    const writable = createWritableRepository(new Map([["first", "Before"]]));
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: ({ assetId, operation }) => {
        authorized.push(`${operation}:${assetId}`);
        return true;
      },
      resolveExpressionAssetId: () => {
        resolutionCount += 1;
        return resolved;
      },
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "expression", value: "post.body" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const instance = loaded.root.fragment.instances[0];
    resolved = "other";

    const pending = expectStatus(
      await session.prepareSave({
        key: loaded.key,
        changes: [
          {
            root: { type: "external", identity: loaded.identity },
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: [instance.id, "children", 0],
                    value: { type: "text", value: "After" },
                  },
                ],
              },
            ],
          },
        ],
      }),
      "pending"
    );

    expect(resolutionCount).toBe(1);
    expect(pending.writes[0].root.identity.assetId).toBe("first");
    expectStatus(await session.flush(loaded.key), "saved");
    expect(authorized).toEqual(["read:first", "write:first", "write:first"]);
  });

  test("does not discard a pending save when the same scope is reopened", async () => {
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["post", "Before"]])),
      authorizeAsset: () => true,
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    const instance = loaded.root.fragment.instances[0];
    const pending = expectStatus(
      await session.prepareSave({
        key: loaded.key,
        changes: [
          {
            root: { type: "external", identity: loaded.identity },
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: [instance.id, "children", 0],
                    value: { type: "text", value: "After" },
                  },
                ],
              },
            ],
          },
        ],
      }),
      "pending"
    );

    expect(await session.open(input)).toBe(pending);
    expect(session.get(loaded.key)).toBe(pending);
  });

  test("keeps a session saved when there are no writes to prepare", async () => {
    let scheduled = false;
    const session = createMdxAssetEditingSession({
      repository: createRepository(new Map([["post", "Body"]])),
      authorizeAsset: () => true,
      schedule: () => {
        scheduled = true;
      },
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");

    expect(await session.prepareSave({ key: loaded.key, changes: [] })).toBe(
      loaded
    );
    expect(await session.queueSave({ key: loaded.key, changes: [] })).toBe(
      loaded
    );
    expect(scheduled).toBe(false);
    expect(session.get(loaded.key)).toBe(loaded);
  });

  test("debounces and coalesces text, prop, and reorder edits", async () => {
    const writable = createWritableRepository(
      new Map([
        [
          "post",
          `<ws.element ws:tag="p" class="before">Before</ws.element>\n\nSecond`,
        ],
      ])
    );
    const tasks = new Set<() => void>();
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      debounceMilliseconds: 10,
      schedule: (callback) => {
        tasks.add(callback);
        return callback;
      },
      cancelScheduled: (callback) => {
        tasks.delete(callback as () => void);
      },
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const textPending = expectStatus(
      await session.queueSave({
        key: loaded.key,
        changes: [textChange(loaded, "After")],
      }),
      "pending"
    );
    const classProp = textPending.root.fragment.props.find(
      ({ name }) => name === "class"
    )!;
    const propPending = expectStatus(
      await session.queueSave({
        key: loaded.key,
        changes: [
          {
            root: { type: "external", identity: textPending.identity },
            payload: [
              {
                namespace: "props",
                patches: [
                  {
                    op: "replace",
                    path: [classProp.id, "value"],
                    value: "after",
                  },
                ],
              },
            ],
          },
        ],
      }),
      "pending"
    );
    await session.queueSave({
      key: loaded.key,
      changes: [
        {
          root: { type: "external", identity: propPending.identity },
          payload: [
            {
              namespace: "fragment",
              patches: [
                {
                  op: "replace",
                  path: ["children"],
                  value: [...propPending.root.fragment.children].reverse(),
                },
              ],
            },
          ],
        },
      ],
    });

    expect(tasks.size).toBe(1);
    tasks.values().next().value?.();
    const saved = expectStatus(await session.flush(loaded.key), "saved");
    expect(writable.updates).toHaveLength(1);
    expect(writable.updates[0].source).toContain('class="after"');
    expect(writable.updates[0].source).toContain("After");
    expect(writable.updates[0].source.indexOf("Second")).toBeLessThan(
      writable.updates[0].source.indexOf("After")
    );
    expect(saved.identity.contentRef).toBe("post_revision_1.mdx");
    expect(await session.flush(loaded.key)).toBe(saved);
    expect(writable.updates).toHaveLength(1);
  });

  test("replaces pending source locally and persists the next replacement", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const tasks = new Set<() => void>();
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: (callback) => {
        tasks.add(callback);
        return callback;
      },
      cancelScheduled: (callback) => tasks.delete(callback as () => void),
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const pending = expectStatus(
      await session.queueSave({
        key: loaded.key,
        changes: [textChange(loaded, "After")],
      }),
      "pending"
    );

    const restored = await session.replaceSource({
      key: loaded.key,
      expectedSource: pending.localSource,
      source: loaded.source,
    });
    expect(restored).toMatchObject({
      status: "applied",
      state: { status: "saved" },
    });
    expect(tasks.size).toBe(0);
    expect(writable.updates).toHaveLength(0);

    const replaced = await session.replaceSource({
      key: loaded.key,
      expectedSource: loaded.source,
      source: pending.localSource,
    });
    expect(replaced).toMatchObject({
      status: "applied",
      state: { status: "pending" },
    });
    expectStatus(await session.flush(loaded.key), "saved");
    expect(writable.sources.get("post")).toContain("After");
  });

  test("reports a committed restore when rematerialization fails after writing", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const state = createState();
    const updateContent = writable.repository.updateContent;
    const session = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async (input) => {
          const result = await updateContent(input);
          state.assets = undefined;
          return result;
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state,
        projectId: "project",
      }),
      "saved"
    );

    const restored = await session.persistSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "After",
    });

    expect(restored).toMatchObject({
      status: "applied",
      state: { status: "recoverable", committedSource: "After" },
    });
    expect(writable.sources.get("post")).toBe("After");
  });

  test("treats restoring the current source as an idempotent no-op", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const tasks = new Set<() => void>();
    let scheduledCalls = 0;
    let cancelledCalls = 0;
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: (callback) => {
        scheduledCalls += 1;
        tasks.add(callback);
        return callback;
      },
      cancelScheduled: (callback) => {
        cancelledCalls += 1;
        tasks.delete(callback as () => void);
      },
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const pending = expectStatus(
      await session.queueSave({
        key: loaded.key,
        changes: [textChange(loaded, "After")],
      }),
      "pending"
    );

    expect(
      await session.replaceSource({
        key: loaded.key,
        expectedSource: pending.localSource,
        source: pending.localSource,
      })
    ).toMatchObject({ status: "applied", state: { status: "pending" } });
    expect(scheduledCalls).toBe(1);
    expect(cancelledCalls).toBe(0);
    expect(tasks.size).toBe(1);
    expect(writable.updates).toHaveLength(0);
  });

  test("prepares a multi-root restore without scheduling independent persistence", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const tasks = new Set<() => void>();
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: (callback) => {
        tasks.add(callback);
        return callback;
      },
      cancelScheduled: (callback) => tasks.delete(callback as () => void),
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const prepared = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "After",
    });
    if (prepared.status !== "ready") {
      throw new Error("Expected source restore to be ready");
    }

    expect(prepared.canApply().status).toBe("ready");
    expect(prepared.apply({ schedule: false })).toMatchObject({
      status: "applied",
      state: { status: "pending", localSource: "After" },
    });
    expect(tasks.size).toBe(0);
    expect(writable.updates).toHaveLength(0);
  });

  test("authorizes the exact pinned Asset before preparing a source replacement", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: ({ operation, assetId, identity }) => {
        if (
          operation === "write" &&
          assetId === "post" &&
          identity?.contentRef === "post_hash.mdx"
        ) {
          throw new Error("Authorization service unavailable");
        }
        return operation === "read";
      },
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );

    expect(
      await session.prepareSourceReplacement({
        key: loaded.key,
        expectedSource: loaded.source,
        source: "After",
      })
    ).toMatchObject({
      status: "blocked",
      reason: "unauthorized",
      currentSource: "Before",
    });
    expect(session.get(loaded.key)).toBe(loaded);
    expect(writable.updates).toHaveLength(0);
  });

  test("rejects a prepared restore after the session changes", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    const prepared = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "After",
    });
    if (prepared.status !== "ready") {
      throw new Error("Expected source restore to be ready");
    }

    session.cancel(loaded.key);

    expect(prepared.canApply()).toMatchObject({
      status: "blocked",
      reason: "source-mismatch",
    });
    expect(() => prepared.apply()).toThrowError();
    expect(writable.updates).toHaveLength(0);
  });

  test("rejects a prepared restore after the pinned Asset revision changes", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    const prepared = await session.prepareSourceReplacement({
      key: loaded.key,
      expectedSource: loaded.source,
      source: "After",
    });
    if (prepared.status !== "ready") {
      throw new Error("Expected source restore to be ready");
    }
    await writable.repository.updateContent({
      assetId: "post",
      expectedName: loaded.identity.contentRef,
      data: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(loaded.source));
          controller.close();
        },
      }),
    });

    const reopened = expectStatus(await session.open(input), "saved");
    expect(reopened.identity.contentRef).not.toBe(loaded.identity.contentRef);
    expect(prepared.canApply()).toMatchObject({
      status: "blocked",
      reason: "identity-mismatch",
    });
    expect(() => prepared.apply()).toThrowError();
  });

  test("replaces saved content against each latest revision", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "After")],
    });
    const savedAfter = expectStatus(await session.flush(loaded.key), "saved");

    expect(
      await session.replaceSource({
        key: loaded.key,
        expectedSource: savedAfter.source,
        source: loaded.source,
      })
    ).toMatchObject({ status: "applied", state: { status: "pending" } });
    const savedBefore = expectStatus(await session.flush(loaded.key), "saved");
    expect(savedBefore.identity.contentRef).toBe("post_revision_2.mdx");
    expect(writable.sources.get("post")).toBe("Before");

    expect(
      await session.replaceSource({
        key: loaded.key,
        expectedSource: savedBefore.source,
        source: savedAfter.source,
      })
    ).toMatchObject({ status: "applied", state: { status: "pending" } });
    const replaced = expectStatus(await session.flush(loaded.key), "saved");
    expect(replaced.identity.contentRef).toBe("post_revision_3.mdx");
    expect(writable.sources.get("post")).toContain("After");
  });

  test("serializes an edit queued while a write is in flight", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const updateContent = writable.repository.updateContent;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let updateCount = 0;
    const session = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async (input) => {
          updateCount += 1;
          if (updateCount === 1) {
            await firstGate;
          }
          return updateContent(input);
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "First")],
    });
    const flushing = session.flush(loaded.key);
    await Promise.resolve();
    const firstPending = expectStatus(session.get(loaded.key)!, "pending");
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(firstPending, "Second")],
    });
    const joinedFlush = session.flush(loaded.key);
    releaseFirst();

    const saved = expectStatus(await flushing, "saved");
    expectStatus(await joinedFlush, "saved");
    expect(writable.updates.map(({ source }) => source.trim())).toEqual([
      "First",
      "Second",
    ]);
    expect(saved.identity.contentRef).toBe("post_revision_2.mdx");
  });

  test("does not reload remote state while a write is in flight", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const updateContent = writable.repository.updateContent;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async (input) => {
          await gate;
          return updateContent(input);
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "After")],
    });
    const flushing = session.flush(loaded.key);
    await Promise.resolve();

    await expect(session.reloadRemote(loaded.key)).rejects.toThrow(
      "Cannot reload an MDX Asset while its write is in flight"
    );
    release();
    expectStatus(await flushing, "saved");
  });

  test("preserves a conflicting local source for retry and remote reload", async () => {
    const writable = createWritableRepository(new Map([["post", "Remote"]]));
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "Local")],
    });
    writable.names.set("post", "post_remote.mdx");

    expectStatus(await session.flush(loaded.key), "conflicting");
    expect(session.copyUnsavedSource(loaded.key)).toContain("Local");
    expectStatus(await session.retry(loaded.key), "conflicting");

    const remote = expectStatus(
      await session.reloadRemote(loaded.key),
      "saved"
    );
    expect(remote.identity.contentRef).toBe("post_remote.mdx");
    expect(remote.root.fragment.instances[0].children).toEqual([
      { type: "text", value: "Remote" },
    ]);
    expect(session.copyUnsavedSource(loaded.key)).toContain("Local");
  });

  test("keeps failed local writes retryable", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const updateContent = writable.repository.updateContent;
    let shouldFail = true;
    const session = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async (input) => {
          if (shouldFail) {
            shouldFail = false;
            throw new Error("Offline");
          }
          return updateContent(input);
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "After")],
    });

    const failed = expectStatus(await session.flush(loaded.key), "failed");
    expect(failed.error.message).toBe("Offline");
    expect(session.copyUnsavedSource(loaded.key)).toContain("After");
    if (!("localSource" in failed)) {
      throw new Error("Expected failed write state");
    }
    expect(
      session.canReplaceSource({
        key: loaded.key,
        expectedSource: failed.localSource,
      })
    ).toMatchObject({ status: "blocked", reason: "unresolved-write" });
    expect(
      await session.replaceSource({
        key: loaded.key,
        expectedSource: failed.localSource,
        source: loaded.source,
      })
    ).toMatchObject({ status: "blocked", reason: "unresolved-write" });
    expect(await session.open(input)).toBe(failed);
    expectStatus(await session.retry(loaded.key), "saved");
    expect(writable.sources.get("post")).toContain("After");
  });

  test("rechecks exact Asset authorization when a queued write flushes", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    let canWrite = true;
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: ({ operation, assetId, identity }) =>
        operation === "read" ||
        (canWrite &&
          assetId === "post" &&
          identity?.contentRef === "post_hash.mdx"),
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "After")],
    });
    canWrite = false;

    const failed = expectStatus(await session.flush(loaded.key), "failed");
    expect(failed.error.message).toBe(
      "MDX Asset is not authorized for writing"
    );
    expect(writable.updates).toHaveLength(0);
    expect(session.copyUnsavedSource(loaded.key)).toContain("After");
  });

  test("flushes independent Assets concurrently without scope leakage", async () => {
    const writable = createWritableRepository(
      new Map([
        ["first", "First"],
        ["second", "Second"],
      ])
    );
    const updateContent = writable.repository.updateContent;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let active = 0;
    let maximumActive = 0;
    const session = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async (input) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          await gate;
          const result = await updateContent(input);
          active -= 1;
          return result;
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const input = {
      blockInstanceId: "block",
      state: createState(),
      projectId: "project",
    };
    const first = expectStatus(
      await session.open({
        ...input,
        source: { type: "asset", assetId: "first" },
        renderScope: "collection:first",
      }),
      "saved"
    );
    const second = expectStatus(
      await session.open({
        ...input,
        source: { type: "asset", assetId: "second" },
        renderScope: "collection:second",
      }),
      "saved"
    );
    await session.queueSave({
      key: first.key,
      changes: [textChange(first, "First updated")],
    });
    await session.queueSave({
      key: second.key,
      changes: [textChange(second, "Second updated")],
    });
    const flushing = Promise.all([
      session.flush(first.key),
      session.flush(second.key),
    ]);
    await Promise.resolve();
    await Promise.resolve();
    expect(maximumActive).toBe(2);
    release();
    const results = await flushing;

    expect(results.map(({ status }) => status)).toEqual(["saved", "saved"]);
    expect(writable.sources.get("first")).toContain("First updated");
    expect(writable.sources.get("second")).toContain("Second updated");
  });

  test("cancels a queued write without persisting and rejects stale returned identity", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const tasks = new Set<() => void>();
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: () => true,
      schedule: (callback) => {
        tasks.add(callback);
        return callback;
      },
      cancelScheduled: (callback) => tasks.delete(callback as () => void),
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    const pending = expectStatus(
      await session.queueSave({
        key: loaded.key,
        changes: [textChange(loaded, "Cancelled")],
      }),
      "pending"
    );
    expect(session.cancel(loaded.key).status).toBe("cancelled");
    expect(tasks.size).toBe(0);
    expectStatus(await session.flush(loaded.key), "cancelled");
    expect(writable.updates).toHaveLength(0);
    expect(
      await session.replaceSource({
        key: loaded.key,
        expectedSource: pending.localSource,
        source: loaded.source,
      })
    ).toMatchObject({ status: "applied", state: { status: "saved" } });

    const stale = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async ({ assetId, data }) => {
          const source = await readStream(data);
          return {
            ...asset(assetId, `${assetId}_next.mdx`),
            projectId: "other-project",
            size: encoder.encode(source).byteLength,
          };
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const staleLoaded = expectStatus(await stale.open(input), "saved");
    await stale.queueSave({
      key: staleLoaded.key,
      changes: [textChange(staleLoaded, "Stale")],
    });
    const conflict = expectStatus(
      await stale.flush(staleLoaded.key),
      "conflicting"
    );
    expect("error" in conflict && conflict.error.message).toBe(
      "Asset repository returned a stale MDX revision"
    );
    expect(stale.copyUnsavedSource(staleLoaded.key)).toContain("Stale");
    stale.cancel(staleLoaded.key);
    expect(
      stale.canReplaceSource({
        key: staleLoaded.key,
        expectedSource: stale.copyUnsavedSource(staleLoaded.key)!,
      })
    ).toMatchObject({ status: "blocked", reason: "unresolved-write" });
  });

  test("cancels an in-flight flush before storage starts", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    let releaseAuthorization!: () => void;
    const authorizationGate = new Promise<void>((resolve) => {
      releaseAuthorization = resolve;
    });
    let writeAuthorizations = 0;
    const session = createMdxAssetEditingSession({
      repository: writable.repository,
      authorizeAsset: async ({ operation }) => {
        if (operation === "write") {
          writeAuthorizations += 1;
          if (writeAuthorizations === 2) {
            await authorizationGate;
          }
        }
        return true;
      },
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const loaded = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "Cancelled")],
    });
    const flushing = session.flush(loaded.key);
    await Promise.resolve();
    session.cancel(loaded.key);
    releaseAuthorization();

    expectStatus(await flushing, "cancelled");
    expect(writable.updates).toHaveLength(0);
  });

  test("reopens against remote content after cancelling an active storage write", async () => {
    const writable = createWritableRepository(new Map([["post", "Before"]]));
    const updateContent = writable.repository.updateContent;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const storageStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const session = createMdxAssetEditingSession({
      repository: {
        ...writable.repository,
        updateContent: async (input) => {
          started();
          await gate;
          return updateContent(input);
        },
      },
      authorizeAsset: () => true,
      schedule: () => 0,
      cancelScheduled: () => {},
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const loaded = expectStatus(await session.open(input), "saved");
    await session.queueSave({
      key: loaded.key,
      changes: [textChange(loaded, "After")],
    });
    const flushing = session.flush(loaded.key);
    await storageStarted;
    session.cancel(loaded.key);
    release();

    expectStatus(await flushing, "cancelled");
    expect(
      session.canReplaceSource({
        key: loaded.key,
        expectedSource: loaded.source,
      })
    ).toMatchObject({ status: "blocked", reason: "unresolved-write" });
    const reopened = expectStatus(await session.open(input), "saved");
    expect(reopened.identity.contentRef).toBe("post_revision_1.mdx");
    expect(reopened.root.fragment.instances[0].children).toEqual([
      { type: "text", value: "After" },
    ]);
  });

  test("reports changed direct bindings and stale revisions as conflicts", async () => {
    const mismatchedRepository = {
      readContent: async () => {
        const bytes = encoder.encode("Body");
        return {
          asset: { ...asset("other"), size: bytes.byteLength },
          data: {
            async *[Symbol.asyncIterator]() {
              yield bytes;
            },
          },
        };
      },
    } satisfies Pick<AssetRepository, "readContent">;
    const mismatch = createMdxAssetEditingSession({
      repository: mismatchedRepository,
      authorizeAsset: () => true,
    });
    const changed = expectStatus(
      await mismatch.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "selected" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "conflicting"
    );
    expect(changed.diagnostics).toMatchObject([
      {
        code: "changed-binding",
        loadedAssetId: "other",
        resolvedAssetId: "selected",
      },
    ]);

    const stale = createMdxAssetEditingSession({
      repository: createRepository(new Map([["selected", "Body"]])),
      authorizeAsset: () => true,
    });
    const conflict = expectStatus(
      await stale.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "selected" },
        renderScope: "page:/one",
        expectedRevision: "sha256:stale",
        state: createState(),
        projectId: "project",
      }),
      "conflicting"
    );
    expect(conflict.diagnostics).toMatchObject([
      {
        code: "stale-revision",
        expectedRevision: "sha256:stale",
      },
    ]);

    const legacy = expectStatus(
      await stale.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "selected" },
        renderScope: "page:/legacy",
        expectedRevision: "file:selected_hash.mdx:2026-01-02T00:00:00.000Z:4",
        state: createState(),
        projectId: "project",
      }),
      "saved"
    );
    expect(legacy.identity.revision).toBe(
      "file:selected_hash.mdx:2026-01-02T00:00:00.000Z:4"
    );
  });

  test.each([
    [{ projectId: "other" }, "Body"],
    [{ size: 3 }, "Body"],
  ])(
    "rejects content whose identity does not match its bytes %#",
    async (assetOverride, source) => {
      const bytes = encoder.encode(source);
      const session = createMdxAssetEditingSession({
        repository: {
          readContent: async () => ({
            asset: {
              ...asset("post"),
              size: bytes.byteLength,
              ...assetOverride,
            },
            data: {
              async *[Symbol.asyncIterator]() {
                yield bytes;
              },
            },
          }),
        },
        authorizeAsset: () => true,
      });

      const failed = expectStatus(
        await session.open({
          blockInstanceId: "block",
          source: { type: "asset", assetId: "post" },
          renderScope: "page:/one",
          state: createState(),
          projectId: "project",
        }),
        "failed"
      );
      expect(failed.error.message).toBe(
        "Asset content identity does not match its bytes"
      );
    }
  );

  test("keeps invalid and unsafe MDX recoverable and supports reload/cancel", async () => {
    const sources = new Map([["post", `<ws.element ws:tag="p">`]]);
    const session = createMdxAssetEditingSession({
      repository: createRepository(sources),
      authorizeAsset: () => true,
    });
    const input = {
      blockInstanceId: "block",
      source: { type: "asset" as const, assetId: "post" },
      renderScope: "page:/one",
      state: createState(),
      projectId: "project",
    };
    const invalid = expectStatus(await session.open(input), "recoverable");
    expect(invalid.diagnostics[0]).toMatchObject({ code: "invalid-mdx" });

    sources.set("post", `{alert("unsafe")}`);
    const recoverable = expectStatus(await session.open(input), "recoverable");
    expect(recoverable.diagnostics[0]).toMatchObject({ code: "unsafe-mdx" });

    sources.set("post", "Recovered");
    const recovered = expectStatus(await session.open(input), "saved");
    expect(recovered.key).not.toBe(recoverable.key);
    expect(session.cancel(recovered.key).status).toBe("cancelled");
  });

  test("keeps invalid UTF-8 recoverable", async () => {
    const bytes = new Uint8Array([0xff]);
    const session = createMdxAssetEditingSession({
      repository: {
        readContent: async () => ({
          asset: { ...asset("post"), size: bytes.byteLength },
          data: {
            async *[Symbol.asyncIterator]() {
              yield bytes;
            },
          },
        }),
      },
      authorizeAsset: () => true,
    });

    const recoverable = expectStatus(
      await session.open({
        blockInstanceId: "block",
        source: { type: "asset", assetId: "post" },
        renderScope: "page:/one",
        state: createState(),
        projectId: "project",
      }),
      "recoverable"
    );
    expect(recoverable.diagnostics).toMatchObject([{ code: "invalid-mdx" }]);
  });
});
