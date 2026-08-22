import { expect, test, vi } from "vitest";
import { createMdxAssetEditingSession } from "@webstudio-is/project-build/runtime";
import { AssetRevisionConflictError } from "@webstudio-is/asset-uploader/content-repository";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { createContentBlockSourceController } from "./content-block-source-controller";

const encoder = new TextEncoder();

const createRepository = (
  source: string,
  updateError?: Error,
  beforeUpdate?: () => Promise<void>
) => {
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
      await beforeUpdate?.();
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
    getSource: () => currentSource,
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
  updateError,
  onRevisionConflict,
  beforeUpdate,
}: {
  state: ReturnType<typeof createState>;
  fileSource?: string;
  authorizeAsset?: () => boolean;
  updateError?: Error;
  onRevisionConflict?: (message: string) => void;
  beforeUpdate?: () => Promise<void>;
}) => {
  const storage = createRepository(fileSource, updateError, beforeUpdate);
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
    getState: () => ({ ...state }) as never,
    commitProjectPayload,
    invalidateAssets,
    publishSessionState,
    onRevisionConflict,
  });
  return {
    controller,
    commitProjectPayload,
    invalidateAssets,
    publishSessionState,
    session,
    storage,
  };
};

test("connects using file content through one Builder project transaction", async () => {
  const setup = createController({ state: createState() });
  const source = { type: "asset" as const, assetId: "post" };

  await expect(setup.controller.requestSource({ source })).resolves.toEqual({
    status: "requires-confirmation",
  });
  await expect(
    setup.controller.requestSource({ source, confirmed: true })
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

test("never writes the selected Asset while connecting", async () => {
  const setup = createController({ state: createState() });
  const source = { type: "asset" as const, assetId: "post" };
  await setup.controller.requestSource({ source });

  const result = await setup.controller.requestSource({
    source,
    confirmed: true,
  });

  expect(result).toMatchObject({ status: "applied" });
  expect(setup.commitProjectPayload).toHaveBeenCalledOnce();
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
  expect(setup.storage.reads).toBe(2);
  expect(setup.publishSessionState).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: "saved" })
  );
});

test("leaves the Asset unchanged when the project connection fails", async () => {
  const setup = createController({ state: createState() });
  const source = { type: "asset" as const, assetId: "post" };
  setup.commitProjectPayload.mockRejectedValueOnce(
    new Error("Project connection failed")
  );
  await setup.controller.requestSource({ source });

  await expect(
    setup.controller.requestSource({
      source,
      confirmed: true,
    })
  ).resolves.toMatchObject({
    status: "blocked",
  });
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
  expect(setup.publishSessionState).not.toHaveBeenCalled();
  expect(setup.invalidateAssets).not.toHaveBeenCalled();
});

test("does not start lifecycle persistence after disposal", async () => {
  const setup = createController({ state: createState() });
  const source = { type: "asset" as const, assetId: "post" };
  await setup.controller.requestSource({ source });
  const request = setup.controller.requestSource({
    source,
    confirmed: true,
  });
  setup.controller.dispose();

  await expect(request).resolves.toMatchObject({
    status: "blocked",
    message: "The MDX Asset session is closed.",
  });
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
  expect(setup.session.list()).toEqual([
    expect.objectContaining({ status: "saved", source: "# File body" }),
  ]);
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

test("repairs stale persisted content after loading a connected source", async () => {
  const source = { type: "asset" as const, assetId: "post" };
  const setup = createController({ state: createState({ source }) });

  await expect(setup.controller.open(source)).resolves.toMatchObject({
    status: "saved",
  });

  expect(setup.commitProjectPayload).toHaveBeenCalledOnce();
  expect(setup.commitProjectPayload.mock.calls[0]?.[0]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ namespace: "instances" }),
    ])
  );
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
});

test("requires a reload instead of disconnecting with stale file content", async () => {
  const source = { type: "asset" as const, assetId: "post" };
  const onRevisionConflict = vi.fn();
  const setup = createController({
    state: createState({ body: false, source }),
    onRevisionConflict,
  });
  await setup.controller.open(source);
  setup.storage.setSource("Changed remotely");

  await expect(setup.controller.disconnect()).resolves.toMatchObject({
    status: "blocked",
    code: "content-source-write-conflict",
  });
  expect(onRevisionConflict).toHaveBeenCalledOnce();
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
});

test("saves the complete frontmatter object without changing the MDX body", async () => {
  const source = { type: "asset" as const, assetId: "post" };
  const setup = createController({
    state: createState({ body: false, source }),
    fileSource: "---\ntitle: Old\n---\n\n# File body\n",
  });
  await setup.controller.open(source);

  await expect(
    setup.controller.saveFrontmatter({
      title: "New",
      tags: ["one", "two"],
      author: { name: "Ada" },
    })
  ).resolves.toMatchObject({ status: "applied" });

  expect(setup.storage.getSource()).toContain("# File body");
  expect(setup.storage.getSource()).toContain("title: New");
  expect(setup.storage.getSource()).toContain("tags:");
  expect(setup.storage.getSource()).toContain("name: Ada");
  expect(setup.storage.updateContent).toHaveBeenCalledOnce();
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
});

test("routes a stale frontmatter revision through the standard reload handler", async () => {
  const source = { type: "asset" as const, assetId: "post" };
  const onRevisionConflict = vi.fn();
  const setup = createController({
    state: createState({ body: false, source }),
    fileSource: "---\ntitle: Old\n---\n\n# File body\n",
    updateError: new AssetRevisionConflictError("Asset revision conflict"),
    onRevisionConflict,
  });
  await setup.controller.open(source);

  await expect(
    setup.controller.saveFrontmatter({ title: "New" })
  ).resolves.toMatchObject({
    status: "blocked",
    code: "content-source-write-conflict",
  });
  expect(onRevisionConflict).toHaveBeenCalledOnce();
});

test("serializes consecutive frontmatter saves against the latest revision", async () => {
  let continueFirstSave: (() => void) | undefined;
  const firstSaveBlocked = new Promise<void>((resolve) => {
    continueFirstSave = resolve;
  });
  let updateCount = 0;
  const source = { type: "asset" as const, assetId: "post" };
  const setup = createController({
    state: createState({ body: false, source }),
    fileSource: "---\ntitle: Original\n---\n\n# File body\n",
    beforeUpdate: async () => {
      updateCount += 1;
      if (updateCount === 1) {
        await firstSaveBlocked;
      }
    },
  });
  await setup.controller.open(source);

  const first = setup.controller.saveFrontmatter({ title: "First" });
  const second = setup.controller.saveFrontmatter({ title: "Second" });
  await vi.waitFor(() =>
    expect(setup.storage.updateContent).toHaveBeenCalledOnce()
  );
  continueFirstSave?.();

  await expect(first).resolves.toMatchObject({ status: "applied" });
  await expect(second).resolves.toMatchObject({ status: "applied" });
  expect(setup.storage.updateContent).toHaveBeenCalledTimes(2);
  expect(setup.storage.getSource()).toContain("title: Second");
});

test("rejects stale project preparation before committing a patch", async () => {
  const state = createState({ body: false });
  const setup = createController({ state });
  const source = { type: "asset" as const, assetId: "post" };
  const pending = setup.controller.requestSource({ source });
  state.props = new Map(state.props);

  await expect(pending).resolves.toEqual({
    status: "blocked",
    code: "content-source-session-failed",
    message: "The project changed while preparing this source update.",
  });
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
});

test("requires renewed confirmation when the project changes while the dialog is open", async () => {
  const state = createState();
  const setup = createController({ state });
  const source = { type: "asset" as const, assetId: "post" };

  await expect(setup.controller.requestSource({ source })).resolves.toEqual({
    status: "requires-confirmation",
  });
  state.props = new Map(state.props);

  await expect(
    setup.controller.requestSource({ source, confirmed: true })
  ).resolves.toEqual({ status: "requires-confirmation" });
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
  expect(setup.storage.updateContent).not.toHaveBeenCalled();
});

test("revalidates the selected file before confirming a connection", async () => {
  const setup = createController({ state: createState() });
  const source = { type: "asset" as const, assetId: "post" };

  await expect(setup.controller.requestSource({ source })).resolves.toEqual({
    status: "requires-confirmation",
  });
  setup.storage.setSource("# Changed while confirming");

  await expect(
    setup.controller.requestSource({ source, confirmed: true })
  ).resolves.toMatchObject({
    status: "applied",
    state: { status: "saved", source: "# Changed while confirming" },
  });
  expect(setup.storage.reads).toBe(2);
  expect(setup.commitProjectPayload).toHaveBeenCalledOnce();
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

test("persists a single-Asset content edit and invalidates Asset resources", async () => {
  const setup = createController({
    state: createState({ body: false }),
    fileSource: "Before",
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
});

test("preserves the failed source for recovery when an Asset save fails", async () => {
  const setup = createController({
    state: createState({ body: false }),
    fileSource: "Before",
    updateError: new Error("write failed"),
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
  expect(setup.invalidateAssets).not.toHaveBeenCalled();
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
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
