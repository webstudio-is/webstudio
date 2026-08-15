import { expect, test, vi } from "vitest";
import { createMdxAssetEditingSession } from "@webstudio-is/project-build/runtime";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { createContentBlockSourceController } from "./content-block-source-controller";

const encoder = new TextEncoder();

const createRepository = (source: string, updateError?: Error) => {
  let reads = 0;
  let currentSource = source;
  let revision = 0;
  const updateContent = vi.fn(
    async ({
      assetId,
      data,
    }: {
      assetId: string;
      data: ReadableStream<Uint8Array>;
    }) => {
      if (updateError !== undefined) {
        throw updateError;
      }
      currentSource = await new Response(data).text();
      revision += 1;
      return {
        id: assetId,
        projectId: "project",
        name: `${assetId}_revision_${revision}.mdx`,
        type: "file" as const,
        format: "mdx",
        size: encoder.encode(currentSource).byteLength,
        createdAt: "2026-08-15T00:00:00.000Z",
      };
    }
  );
  return {
    get reads() {
      return reads;
    },
    updateContent,
    setSource: (source: string) => {
      currentSource = source;
    },
    repository: {
      readContent: async ({ assetId }: { assetId: string }) => {
        reads += 1;
        const bytes = encoder.encode(currentSource);
        return {
          asset: {
            id: assetId,
            projectId: "project",
            name: `${assetId}_revision.mdx`,
            type: "file" as const,
            format: "mdx",
            size: bytes.byteLength,
            createdAt: "2026-08-15T00:00:00.000Z",
          },
          data: {
            async *[Symbol.asyncIterator]() {
              yield bytes;
            },
          },
        };
      },
      updateContent,
    },
  };
};

const createState = ({
  body = true,
  source,
}: {
  body?: boolean;
  source?: ContentBlockSource;
} = {}) => ({
  pages: {
    pages: new Map([
      [
        "page",
        {
          id: "page",
          name: "Page",
          path: "",
          title: "Page",
          meta: {},
          rootInstanceId: "block",
        },
      ],
    ]),
    pageTemplates: new Map(),
  },
  assets: new Map(),
  assetFolders: new Map(),
  instances: new Map([
    [
      "block",
      {
        type: "instance" as const,
        id: "block",
        component: blockComponent,
        children: [
          { type: "id" as const, value: "templates" },
          ...(body ? [{ type: "id" as const, value: "body" }] : []),
        ],
      },
    ],
    [
      "templates",
      {
        type: "instance" as const,
        id: "templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
    [
      "body",
      {
        type: "instance" as const,
        id: "body",
        component: elementComponent,
        tag: "p",
        children: [{ type: "text" as const, value: "Block body" }],
      },
    ],
  ]),
  props: new Map(
    source === undefined
      ? []
      : [
          [
            "src",
            source.type === "asset"
              ? {
                  id: "src",
                  instanceId: "block",
                  name: "src",
                  type: "asset" as const,
                  value: source.assetId,
                }
              : {
                  id: "src",
                  instanceId: "block",
                  name: "src",
                  type: "expression" as const,
                  value: source.value,
                },
          ],
        ]
  ),
  dataSources: new Map(),
  resources: new Map(),
  breakpoints: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  marketplaceProduct: undefined,
  projectSettings: undefined,
});

const createController = ({
  state,
  fileSource = "# File body",
  authorizeAsset = () => true,
  recordStorageHistory,
  beginStorageHistory,
  dropStorageHistory,
  disposeStorageHistory,
  updateError,
}: {
  state: ReturnType<typeof createState>;
  fileSource?: string;
  authorizeAsset?: () => boolean;
  recordStorageHistory?: Parameters<
    typeof createContentBlockSourceController
  >[0]["recordStorageHistory"];
  beginStorageHistory?: Parameters<
    typeof createContentBlockSourceController
  >[0]["beginStorageHistory"];
  dropStorageHistory?: Parameters<
    typeof createContentBlockSourceController
  >[0]["dropStorageHistory"];
  disposeStorageHistory?: Parameters<
    typeof createContentBlockSourceController
  >[0]["disposeStorageHistory"];
  updateError?: Error;
}) => {
  const storage = createRepository(fileSource, updateError);
  const session = createMdxAssetEditingSession({
    repository: storage.repository,
    authorizeAsset,
  });
  const commitProjectPayload = vi.fn();
  const invalidateAssets = vi.fn();
  const publishSessionState = vi.fn();
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: "scope",
    projectId: "project",
    session,
    getState: () => ({ ...state } as never),
    commitProjectPayload,
    invalidateAssets,
    publishSessionState,
    recordStorageHistory,
    beginStorageHistory,
    dropStorageHistory,
    disposeStorageHistory,
  });
  return {
    controller,
    commitProjectPayload,
    invalidateAssets,
    publishSessionState,
    storage,
  };
};

test("connects using file content through one Builder project transaction", async () => {
  const setup = createController({ state: createState() });
  const source = { type: "asset" as const, assetId: "post" };

  await expect(setup.controller.requestSource({ source })).resolves.toEqual({
    status: "requires-authority",
  });
  await expect(
    setup.controller.requestSource({ source, authority: "use-file-content" })
  ).resolves.toMatchObject({ status: "applied" });

  expect(setup.commitProjectPayload).toHaveBeenCalledTimes(1);
  expect(setup.commitProjectPayload.mock.calls[0]?.[0]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ namespace: "instances" }),
      expect.objectContaining({ namespace: "props" }),
    ])
  );
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
});

test("blocks combined project and Asset replacement without a partial write", async () => {
  const setup = createController({ state: createState() });

  const result = await setup.controller.requestSource({
    source: { type: "asset", assetId: "post" },
    authority: "replace-file-body-with-block-content",
  });

  expect(result).toEqual({
    status: "blocked",
    message:
      "Replacing file content while changing the Content Block source requires atomic project and Asset persistence, which is not available yet.",
  });
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
  expect(setup.storage.reads).toBe(1);
});

test("disconnects by copying loaded file content into one project transaction", async () => {
  const source = { type: "asset" as const, assetId: "post" };
  const setup = createController({
    state: createState({ body: false, source }),
  });
  await setup.controller.open(source);

  await expect(setup.controller.disconnect()).resolves.toMatchObject({
    status: "applied",
  });

  expect(setup.commitProjectPayload).toHaveBeenCalledTimes(1);
  expect(setup.commitProjectPayload.mock.calls[0]?.[0]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ namespace: "instances" }),
      expect.objectContaining({ namespace: "props" }),
    ])
  );
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
});

test("rejects stale project preparation before committing a patch", async () => {
  const state = createState();
  const setup = createController({ state });
  const pending = setup.controller.requestSource({
    source: { type: "asset", assetId: "post" },
    authority: "use-file-content",
  });
  state.props = new Map(state.props);

  await expect(pending).resolves.toEqual({
    status: "blocked",
    message: "The project changed while preparing this source update.",
  });
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
});

test("surfaces exact Asset authorization failure without a project mutation", async () => {
  const setup = createController({
    state: createState({ body: false }),
    authorizeAsset: () => false,
  });

  const state = await setup.controller.open({
    type: "asset",
    assetId: "post",
  });

  expect(state).toMatchObject({ status: "failed" });
  expect(setup.publishSessionState).toHaveBeenCalledWith(
    expect.objectContaining({ status: "failed" })
  );
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
});

test("retries a recoverable parse failure by reopening the pinned source", async () => {
  const source = { type: "asset" as const, assetId: "post" };
  const setup = createController({
    state: createState({ body: false, source }),
    fileSource: '{alert("unsafe")}',
  });
  await expect(setup.controller.open(source)).resolves.toMatchObject({
    status: "recoverable",
  });
  setup.storage.setSource("# Repaired");

  await expect(setup.controller.retry()).resolves.toMatchObject({
    status: "applied",
    state: { status: "saved" },
  });
  expect(setup.publishSessionState).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: "saved" })
  );
});

test("requires explicit remote reload instead of blindly retrying a conflict", async () => {
  const conflicting = {
    status: "conflicting" as const,
    key: "post",
    identity: { assetId: "post" },
    diagnostics: [],
  };
  const retry = vi.fn();
  const session = {
    open: vi.fn(async () => conflicting),
    get: vi.fn(() => conflicting),
    retry,
    list: () => [],
  };
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: "scope",
    projectId: "project",
    session: session as never,
    getState: () =>
      createState({
        body: false,
        source: { type: "asset", assetId: "post" },
      }) as never,
    commitProjectPayload: vi.fn(),
    invalidateAssets: vi.fn(),
  });
  await controller.open({ type: "asset", assetId: "post" });

  await expect(controller.retry()).resolves.toEqual({
    status: "blocked",
    message: "Reload the remote MDX file before retrying this change.",
  });
  expect(retry).not.toHaveBeenCalled();
});

test("does not publish a retry that finishes after the source changes", async () => {
  const failed = {
    status: "failed" as const,
    key: "first",
    identity: { assetId: "first" },
    diagnostics: [],
    localSource: "Unsaved",
  };
  const saved = (assetId: string) => ({
    status: "saved" as const,
    key: assetId,
    identity: { assetId },
    root: {},
    diagnostics: [],
  });
  let finishRetry: ((state: ReturnType<typeof saved>) => void) | undefined;
  const session = {
    open: vi.fn(({ source }: { source: ContentBlockSource }) =>
      Promise.resolve(
        source.type === "asset" && source.assetId === "first"
          ? failed
          : saved("second")
      )
    ),
    get: vi.fn(() => failed),
    retry: vi.fn(
      () =>
        new Promise<ReturnType<typeof saved>>((resolve) => {
          finishRetry = resolve;
        })
    ),
    list: () => [],
  };
  const publishSessionState = vi.fn();
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: "scope",
    projectId: "project",
    session: session as never,
    getState: () => createState() as never,
    commitProjectPayload: vi.fn(),
    invalidateAssets: vi.fn(),
    publishSessionState,
  });
  await controller.open({ type: "asset", assetId: "first" });
  const retrying = controller.retry();
  await controller.open({ type: "asset", assetId: "second" });
  finishRetry?.(saved("first-retried"));

  await expect(retrying).resolves.toEqual({
    status: "blocked",
    message: "The MDX Asset session changed.",
  });
  expect(publishSessionState).toHaveBeenCalledTimes(2);
  expect(publishSessionState).toHaveBeenLastCalledWith(saved("second"));
});

test("persists a single-Asset content edit and invalidates Asset resources", async () => {
  const recordStorageHistory = vi.fn(
    (
      _input: Parameters<
        NonNullable<
          Parameters<
            typeof createContentBlockSourceController
          >[0]["recordStorageHistory"]
        >
      >[0]
    ) => ({
      status: "applied" as const,
      entryId: "history",
    })
  );
  const beginStorageHistory = vi.fn(() => "history");
  const setup = createController({
    state: createState({ body: false }),
    fileSource: "Before",
    recordStorageHistory,
    beginStorageHistory,
  });
  const loaded = await setup.controller.open({
    type: "asset",
    assetId: "post",
  });
  if (loaded.status !== "saved") {
    throw new Error(`Expected saved state, received ${loaded.status}`);
  }
  expect(setup.controller.isCurrent(loaded.root)).toBe(true);

  const saveResult = await setup.controller.saveStorageChanges([
    {
      root: { type: "external", identity: loaded.identity },
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: [
                loaded.root.fragment.instances[0].id,
                "children",
                0,
                "value",
              ],
              value: "After",
            },
          ],
        },
      ],
    },
  ]);
  expect(saveResult).toMatchObject({ status: "applied" });
  if (saveResult.status !== "applied" || saveResult.state?.status !== "saved") {
    throw new Error("Expected the MDX edit to be saved");
  }
  expect(setup.controller.isCurrent(loaded.root)).toBe(false);
  expect(setup.controller.isCurrent(saveResult.state.root)).toBe(true);

  expect(setup.storage.updateContent).toHaveBeenCalledTimes(1);
  expect(setup.invalidateAssets).toHaveBeenCalledTimes(1);
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
  expect(recordStorageHistory).toHaveBeenCalledOnce();
  expect(beginStorageHistory).toHaveBeenCalledOnce();
  expect(recordStorageHistory).toHaveBeenCalledWith(
    expect.objectContaining({
      beforeSource: "Before",
      afterSource: "After\n",
      id: "history",
      mutation: { payload: [] },
      isCurrent: expect.any(Function),
    })
  );
  const historyInput = recordStorageHistory.mock.calls[0][0];
  expect(historyInput.isCurrent?.()).toBe(true);
  await setup.controller.open({ type: "asset", assetId: "other" });
  expect(historyInput.isCurrent?.()).toBe(false);
});

test("removes its storage history when disposed", () => {
  const disposeStorageHistory = vi.fn();
  const setup = createController({
    state: createState({ body: false }),
    disposeStorageHistory,
  });

  setup.controller.dispose();
  setup.controller.dispose();

  expect(disposeStorageHistory).toHaveBeenCalledOnce();
});

test("drops pending history when the Asset save fails", async () => {
  const recordStorageHistory = vi.fn();
  const beginStorageHistory = vi.fn(() => "failed-history");
  const dropStorageHistory = vi.fn();
  const setup = createController({
    state: createState({ body: false }),
    fileSource: "Before",
    updateError: new Error("write failed"),
    recordStorageHistory,
    beginStorageHistory,
    dropStorageHistory,
  });
  const loaded = await setup.controller.open({
    type: "asset",
    assetId: "post",
  });
  if (loaded.status !== "saved") {
    throw new Error("Expected saved state");
  }

  expect(
    await setup.controller.saveStorageChanges([
      {
        root: { type: "external", identity: loaded.identity },
        payload: [
          {
            namespace: "instances",
            patches: [
              {
                op: "replace",
                path: [
                  loaded.root.fragment.instances[0].id,
                  "children",
                  0,
                  "value",
                ],
                value: "After",
              },
            ],
          },
        ],
      },
    ])
  ).toMatchObject({ status: "blocked" });
  expect(recordStorageHistory).not.toHaveBeenCalled();
  expect(dropStorageHistory).toHaveBeenCalledWith("failed-history");
});

test("keeps the newest source when an older load finishes last", async () => {
  const createLoadedState = (assetId: string) => ({
    status: "saved" as const,
    key: assetId,
    identity: { assetId },
    root: {},
    diagnostics: [],
    source: assetId,
  });
  let finishFirstLoad:
    | ((state: ReturnType<typeof createLoadedState>) => void)
    | undefined;
  const session = {
    open: vi.fn(({ source }: { source: ContentBlockSource }) =>
      source.type === "asset" && source.assetId === "first"
        ? new Promise<ReturnType<typeof createLoadedState>>((resolve) => {
            finishFirstLoad = resolve;
          })
        : Promise.resolve(createLoadedState("second"))
    ),
    queueSave: vi.fn(({ key }: { key: string }) =>
      Promise.resolve(createLoadedState(key))
    ),
    get: (key: string) => createLoadedState(key),
    list: () => [],
  };
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: "scope",
    projectId: "project",
    session: session as never,
    getState: () => createState() as never,
    commitProjectPayload: vi.fn(),
    invalidateAssets: vi.fn(),
  });

  const firstLoad = controller.open({ type: "asset", assetId: "first" });
  await controller.open({ type: "asset", assetId: "second" });
  finishFirstLoad?.(createLoadedState("first"));
  await firstLoad;
  await controller.saveStorageChanges([]);

  expect(session.queueSave).toHaveBeenCalledWith({
    key: "second",
    changes: [],
  });
});

test("finishes an in-flight save against its pinned source after switching", async () => {
  const createLoadedState = (assetId: string) => ({
    status: "saved" as const,
    key: assetId,
    identity: { assetId },
    root: {},
    diagnostics: [],
    source: assetId,
  });
  let finishQueue: ((state: unknown) => void) | undefined;
  const queueSave = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishQueue = resolve;
        })
    )
    .mockImplementation(({ key }: { key: string }) =>
      Promise.resolve(createLoadedState(key))
    );
  const flush = vi.fn((key: string) =>
    Promise.resolve(createLoadedState(`${key}-saved`))
  );
  const session = {
    open: vi.fn(({ source }: { source: ContentBlockSource }) =>
      Promise.resolve(
        createLoadedState(source.type === "asset" ? source.assetId : "dynamic")
      )
    ),
    queueSave,
    flush,
    get: (key: string) => createLoadedState(key),
    list: () => [],
  };
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: "scope",
    projectId: "project",
    session: session as never,
    getState: () => createState() as never,
    commitProjectPayload: vi.fn(),
    invalidateAssets: vi.fn(),
  });

  await controller.open({ type: "asset", assetId: "first" });
  const saving = controller.saveStorageChanges([]);
  await controller.open({ type: "asset", assetId: "second" });
  finishQueue?.({ ...createLoadedState("first"), status: "pending" });
  await saving;
  await controller.saveStorageChanges([]);

  expect(flush).toHaveBeenCalledWith("first");
  expect(queueSave).toHaveBeenLastCalledWith({ key: "second", changes: [] });
});
