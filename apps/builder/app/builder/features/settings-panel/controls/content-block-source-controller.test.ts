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

const createRepository = (source: string) => {
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
}: {
  state: ReturnType<typeof createState>;
  fileSource?: string;
  authorizeAsset?: () => boolean;
}) => {
  const storage = createRepository(fileSource);
  const session = createMdxAssetEditingSession({
    repository: storage.repository,
    authorizeAsset,
  });
  const commitProjectPayload = vi.fn();
  const invalidateAssets = vi.fn();
  const controller = createContentBlockSourceController({
    blockInstanceId: "block",
    renderScope: "scope",
    projectId: "project",
    session,
    getState: () => ({ ...state }) as never,
    commitProjectPayload,
    invalidateAssets,
  });
  return { controller, commitProjectPayload, invalidateAssets, storage };
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

  await expect(
    setup.controller.saveStorageChanges([
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
  ).resolves.toMatchObject({ status: "applied" });

  expect(setup.storage.updateContent).toHaveBeenCalledTimes(1);
  expect(setup.invalidateAssets).toHaveBeenCalledTimes(1);
  expect(setup.commitProjectPayload).not.toHaveBeenCalled();
});

test("keeps the newest source when an older load finishes last", async () => {
  const createLoadedState = (assetId: string) => ({
    status: "saved" as const,
    key: assetId,
    identity: { assetId },
    root: {},
    diagnostics: [],
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
