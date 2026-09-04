import { afterEach, expect, test, vi } from "vitest";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  coreMetas,
  elementComponent,
  type Asset,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import {
  __testing__ as assetContentBridgeTesting,
  createAssetContentBridge,
} from "./asset-content-bridge.client";
import {
  acquireExternalContentRoot,
  disposeExternalContentProject,
  flushExternalContentAsset,
  flushExternalContentProject,
  getExternalContentRootAssets,
  getExternalContentRootSnapshot,
  getExternalContentRootChildren,
  replaceExternalContentAssetSource,
  retryExternalContentAsset,
  subscribeExternalContentAsset,
  updateExternalContentAssetSource,
  updateExternalContentFrontmatter,
} from "./external-content-roots";
import {
  executeRuntimeMutation,
  getWebstudioData,
} from "./instance-utils/data";
import {
  $builderMode,
  $registeredComponentMetas,
  selectInstance,
  selectPage,
} from "./nano-states";
import {
  findExternalContentRoot,
  getExternalContentRoots,
  resolveExternalContentOccurrence,
} from "./external-content-mutations";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $projectSettings,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "./sync/data-stores";
import {
  createObjectPool,
  externalContentSyncStore,
  registerContainers,
  serverSyncStore,
} from "./sync/sync-stores";
import { createSyncChangesFromBuilderPatchPayload } from "./sync/builder-patch";
import { insertTemplateAt } from "~/builder/features/workspace/canvas-tools/outline/block-utils";

registerContainers();

test("places unresolved-template placeholders at their authored nesting point", async () => {
  const source =
    '<ws.element ws:tag="section">Before<ws.element ws:name="Missing" />After</ws.element>';
  const sourceAsset = {
    ...asset,
    size: new TextEncoder().encode(source).byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: sourceAsset,
        data: (async function* () {
          yield new TextEncoder().encode(source);
        })(),
      }),
      updateContent: async () => sourceAsset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });

  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: sourceAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  );

  const section = Array.from($instances.get().values()).find(
    (candidate) => candidate.tag === "section"
  );
  const missing = Array.from($instances.get().values()).find(
    (candidate) => candidate.label === "Missing template: Missing"
  );
  expect(missing).toMatchObject({
    component: "ws:element",
    tag: "div",
    children: [{ type: "text", value: "Missing template: Missing" }],
  });
  if (section === undefined || missing === undefined) {
    throw new Error("Expected the section and missing-template placeholder");
  }
  expect(section.children).toEqual([
    { type: "text", value: "Before" },
    { type: "id", value: missing.id },
    { type: "text", value: "After" },
  ]);
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toEqual([{ type: "id", value: section.id }]);
});

test("re-resolves existing Markdown when a matching template is added", async () => {
  const source = "# Existing heading\n";
  const sourceAsset = {
    ...asset,
    size: new TextEncoder().encode(source).byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: sourceAsset,
        data: (async function* () {
          yield new TextEncoder().encode(source);
        })(),
      }),
      updateContent: async () => sourceAsset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });

  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: sourceAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  );

  const initialHeading = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[0];
  if (initialHeading?.type !== "id") {
    throw new Error("Expected the initial materialized heading");
  }
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: initialHeading.value,
      mode: "text",
      text: "Edited heading",
    },
  });

  const insertion = executeRuntimeMutation({
    id: "instances.insertComponent",
    input: {
      parentInstanceId: "templates",
      component: "ws:element",
      tag: "h1",
    },
  });
  const templateId = insertion?.result.rootInstanceIds[0];
  if (templateId === undefined) {
    throw new Error("Expected an inserted heading template");
  }
  executeRuntimeMutation({
    id: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId: templateId,
          name: "title",
          type: "string",
          value: "Template applied",
        },
      ],
    },
  });

  await vi.waitFor(() => {
    const heading = getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })?.[0];
    if (heading?.type !== "id") {
      throw new Error("Expected the materialized heading");
    }
    expect($instances.get().get(heading.value)?.children).toEqual([
      { type: "text", value: "Edited heading" },
    ]);
    expect(
      Array.from($props.get().values()).find(
        (prop) => prop.instanceId === heading.value && prop.name === "title"
      )
    ).toMatchObject({ type: "string", value: "Template applied" });
  });

  const templateRevisionBeforeRemoteChange =
    getExternalContentRoots().values().next().value?.templateMutationRevision ??
    0;
  serverSyncStore.addTransaction(
    "remote-template-style",
    createSyncChangesFromBuilderPatchPayload({
      data: getWebstudioData(),
      payload: [
        {
          namespace: "styleSources",
          patches: [
            {
              op: "add",
              path: ["remote-template-style"],
              value: { type: "local", id: "remote-template-style" },
            },
          ],
        },
        {
          namespace: "styleSourceSelections",
          patches: [
            {
              op: "add",
              path: [templateId],
              value: {
                instanceId: templateId,
                values: ["remote-template-style"],
              },
            },
          ],
        },
        {
          namespace: "styles",
          patches: [
            {
              op: "add",
              path: ["remote-template-style:base:color"],
              value: {
                breakpointId: "base",
                styleSourceId: "remote-template-style",
                property: "color",
                value: { type: "keyword", value: "red" },
              },
            },
          ],
        },
      ] satisfies BuilderPatchChange[],
    }),
    "remote"
  );
  expect(
    getExternalContentRoots().values().next().value?.templateMutationRevision
  ).toBe(templateRevisionBeforeRemoteChange + 1);

  serverSyncStore.undo();
  expect(
    getExternalContentRoots().values().next().value?.templateMutationRevision
  ).toBe(templateRevisionBeforeRemoteChange + 2);
  serverSyncStore.redo();
  expect(
    getExternalContentRoots().values().next().value?.templateMutationRevision
  ).toBe(templateRevisionBeforeRemoteChange + 3);

  const rejectedPayload = createSyncChangesFromBuilderPatchPayload({
    data: getWebstudioData(),
    payload: [
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["remote-template-style:base:background-color"],
            value: {
              breakpointId: "base",
              styleSourceId: "remote-template-style",
              property: "background-color",
              value: { type: "keyword", value: "black" },
            },
          },
        ],
      },
    ] satisfies BuilderPatchChange[],
  });
  const objectPool = createObjectPool();
  objectPool.applyTransaction({
    id: "rejected-template-style",
    object: "server",
    payload: rejectedPayload,
  });
  expect(
    getExternalContentRoots().values().next().value?.templateMutationRevision
  ).toBe(templateRevisionBeforeRemoteChange + 4);
  objectPool.revertTransaction({
    id: "rejected-template-style",
    object: "server",
  });
  expect(
    getExternalContentRoots().values().next().value?.templateMutationRevision
  ).toBe(templateRevisionBeforeRemoteChange + 5);

  await vi.waitFor(() => {
    const heading = getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })?.[0];
    if (heading?.type !== "id") {
      throw new Error("Expected the remotely restyled heading");
    }
    const selection = $styleSourceSelections.get().get(heading.value);
    expect(selection?.values).toHaveLength(1);
    expect(
      Array.from($styles.get().values()).find(
        (style) =>
          style.styleSourceId === selection?.values[0] &&
          style.property === "color"
      )
    ).toMatchObject({ value: { type: "keyword", value: "red" } });
  });
});

test("preserves the last valid materialization while the Templates structure is invalid", async () => {
  const source = "# Heading\n";
  const sourceAsset = {
    ...asset,
    size: new TextEncoder().encode(source).byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: sourceAsset,
        data: (async function* () {
          yield new TextEncoder().encode(source);
        })(),
      }),
      updateContent: async () => sourceAsset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      [
        "templates",
        instance("templates", blockTemplateComponent, [
          { type: "id", value: "heading-template" },
        ]),
      ],
      [
        "heading-template",
        {
          ...instance("heading-template", "ws:element", []),
          tag: "h1",
          label: "Styled heading",
        },
      ],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  serverSyncStore.popAll();
  externalContentSyncStore.popAll();

  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: sourceAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  );
  const headingChild = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[0];
  if (headingChild?.type !== "id") {
    throw new Error("Expected the materialized heading");
  }
  expect($instances.get().get(headingChild.value)?.label).toBe(
    "Styled heading"
  );

  const duplicateTemplates = instance(
    "duplicate-templates",
    blockTemplateComponent,
    []
  );
  const blockBeforeDuplicate = $instances.get().get("block");
  if (blockBeforeDuplicate === undefined) {
    throw new Error("Expected the Content Block");
  }
  serverSyncStore.addTransaction(
    "add-duplicate-templates",
    createSyncChangesFromBuilderPatchPayload({
      data: getWebstudioData(),
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "add",
              path: [duplicateTemplates.id],
              value: duplicateTemplates,
            },
            {
              op: "replace",
              path: [blockBeforeDuplicate.id, "children"],
              value: [
                { type: "id", value: duplicateTemplates.id },
                ...blockBeforeDuplicate.children,
              ],
            },
          ],
        },
      ] satisfies BuilderPatchChange[],
    }),
    "remote"
  );

  await vi.waitFor(() =>
    expect(
      getExternalContentRoots().values().next().value
        ?.templateMaterializationError
    ).toBe("Content Block has 2 Templates containers; exactly one is required")
  );
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toEqual([headingChild]);
  expect($instances.get().get(headingChild.value)?.label).toBe(
    "Styled heading"
  );

  const blockBeforeRepair = $instances.get().get("block");
  if (blockBeforeRepair === undefined) {
    throw new Error("Expected the invalid Content Block");
  }
  serverSyncStore.addTransaction(
    "remove-duplicate-templates",
    createSyncChangesFromBuilderPatchPayload({
      data: getWebstudioData(),
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: [blockBeforeRepair.id, "children"],
              value: blockBeforeRepair.children.filter(
                (child) =>
                  child.type !== "id" || child.value !== duplicateTemplates.id
              ),
            },
            { op: "remove", path: [duplicateTemplates.id] },
          ],
        },
      ] satisfies BuilderPatchChange[],
    }),
    "remote"
  );

  await vi.waitFor(() => {
    const root = getExternalContentRoots().values().next().value;
    expect(root?.templateMaterializationError).toBeUndefined();
    expect(root?.templateContainerIds).toEqual(["templates"]);
  });
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toEqual([headingChild]);
  expect($instances.get().get(headingChild.value)?.label).toBe(
    "Styled heading"
  );
});

test.each([
  ["no Templates container", []],
  ["multiple Templates containers", ["templates-1", "templates-2"]],
] as const)(
  "rejects initial acquisition with %s without registering a root",
  async (_case, templateIds) => {
    const source = "# Heading\n";
    const sourceAsset = {
      ...asset,
      size: new TextEncoder().encode(source).byteLength,
    };
    const session = createAssetContentSession({
      repository: {
        readContent: async () => ({
          asset: sourceAsset,
          data: (async function* () {
            yield new TextEncoder().encode(source);
          })(),
        }),
        updateContent: async () => sourceAsset,
      },
      authorize: () => true,
    });
    sessions.push(session);
    assetContentBridgeTesting.initBridge(
      createAssetContentBridge({
        origin: window.location.origin,
        request: fetch,
        authorize: () => true,
        requireReload: vi.fn(),
        getContentSession: () => session,
      })
    );
    $project.set({ id: "project", title: "Project", domain: "" } as never);
    $pages.set(createDefaultPages({ rootInstanceId: "block" }));
    $instances.set(
      new Map([
        [
          "block",
          instance(
            "block",
            blockComponent,
            templateIds.map((id) => ({ type: "id" as const, value: id }))
          ),
        ],
        ...templateIds.map(
          (id) => [id, instance(id, blockTemplateComponent, [])] as const
        ),
      ])
    );
    $props.set(new Map());
    $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
    $breakpoints.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $styleSources.set(new Map());
    $styleSourceSelections.set(new Map());
    $styles.set(new Map());
    $projectSettings.set({ meta: {}, compiler: {} });

    let release: (() => void) | undefined;
    let acquisitionError: unknown;
    try {
      release = await acquireExternalContentRoot({
        projectId: "project",
        assetId: sourceAsset.id,
        blockInstanceId: "block",
        renderScope: '["block"]',
      });
    } catch (error) {
      acquisitionError = error;
    }

    try {
      expect(acquisitionError).toMatchObject({
        name: "InvalidMdxTemplateStructureError",
        message: expect.stringContaining("exactly one"),
      });
      expect(getExternalContentRoots()).toHaveLength(0);
    } finally {
      release?.();
      if (getExternalContentRoots().size > 0) {
        await disposeExternalContentProject({
          projectId: "project",
          session,
        });
      }
    }
  }
);

test("surfaces a failed template refresh and retries it", async () => {
  const source = "# Heading\n";
  const sourceAsset = {
    ...asset,
    size: new TextEncoder().encode(source).byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: sourceAsset,
        data: (async function* () {
          yield new TextEncoder().encode(source);
        })(),
      }),
      updateContent: async () => sourceAsset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  const bridge = createAssetContentBridge({
    origin: window.location.origin,
    request: fetch,
    authorize: () => true,
    requireReload: vi.fn(),
    getContentSession: () => session,
  });
  assetContentBridgeTesting.initBridge(bridge);
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });

  const insertion = executeRuntimeMutation({
    id: "instances.insertComponent",
    input: {
      parentInstanceId: "templates",
      component: "ws:element",
      tag: "h1",
    },
  });
  const templateId = insertion?.result.rootInstanceIds[0];
  if (templateId === undefined) {
    throw new Error("Expected an inserted heading template");
  }

  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: sourceAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  );
  const states: Array<{ status: string; error?: Error }> = [];
  const unsubscribe = subscribeExternalContentAsset({
    projectId: "project",
    assetId: sourceAsset.id,
    listener: (state) => states.push(state),
  });

  assetContentBridgeTesting.clearBridge();
  executeRuntimeMutation({
    id: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId: templateId,
          name: "title",
          type: "string",
          value: "After",
        },
      ],
    },
  });
  const templatePropId = Array.from($props.get().values()).find(
    (prop) => prop.instanceId === templateId && prop.name === "title"
  )?.id;
  if (templatePropId === undefined) {
    throw new Error("Expected the template prop");
  }

  await vi.waitFor(() => {
    expect(states.at(-1)?.status).toBe("failed");
    expect(states.at(-1)?.error?.message).toBeTruthy();
  });
  expect(
    getExternalContentRoots()
      .values()
      .next()
      .value?.templateOwnership?.props?.has(templatePropId)
  ).toBe(false);

  await expect(
    retryExternalContentAsset({
      projectId: "project",
      assetId: sourceAsset.id,
    })
  ).rejects.toThrow("bridge");
  expect(states.at(-1)?.status).toBe("failed");

  assetContentBridgeTesting.initBridge(bridge);
  await retryExternalContentAsset({
    projectId: "project",
    assetId: sourceAsset.id,
  });

  const heading = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[0];
  if (heading?.type !== "id") {
    throw new Error("Expected the materialized heading");
  }
  expect(
    Array.from($props.get().values()).find(
      (prop) => prop.instanceId === heading.value && prop.name === "title"
    )
  ).toMatchObject({ type: "string", value: "After" });
  expect(states.at(-1)?.status).not.toBe("failed");
  expect(
    getExternalContentRoots()
      .values()
      .next()
      .value?.templateOwnership?.props?.has(templatePropId)
  ).toBe(true);

  unsubscribe();
});

const asset: Asset = {
  id: "asset",
  projectId: "project",
  name: "article_v1.mdx",
  type: "file",
  format: "mdx",
  size: 7,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: {},
};

const instance = (
  id: string,
  component: string,
  children: Instance["children"]
): Instance => ({ type: "instance", id, component, children });

const releases: Array<() => void> = [];
const sessions: Array<ReturnType<typeof createAssetContentSession>> = [];

afterEach(() => {
  assetContentBridgeTesting.clearBridge();
  $builderMode.set("design");
  for (const release of releases.splice(0)) {
    release();
  }
  for (const session of sessions.splice(0)) {
    session.dispose();
  }
});

test("does not let initial materialization overwrite a newer template refresh", async () => {
  const source = "# Heading\n";
  const sourceAsset = {
    ...asset,
    size: new TextEncoder().encode(source).byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: sourceAsset,
        data: (async function* () {
          yield new TextEncoder().encode(source);
        })(),
      }),
      updateContent: async () => sourceAsset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      [
        "templates",
        instance("templates", blockTemplateComponent, [
          { type: "id", value: "heading-template" },
        ]),
      ],
      [
        "heading-template",
        {
          ...instance("heading-template", elementComponent, []),
          tag: "h1",
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "heading-title",
        {
          id: "heading-title",
          instanceId: "heading-template",
          name: "title",
          type: "string" as const,
          value: "Old",
        },
      ],
    ])
  );
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  serverSyncStore.popAll();
  externalContentSyncStore.popAll();

  let releaseFirstDigest: (() => void) | undefined;
  const firstDigestGate = new Promise<void>((resolve) => {
    releaseFirstDigest = resolve;
  });
  let notifyFirstDigest: (() => void) | undefined;
  const firstDigestStarted = new Promise<void>((resolve) => {
    notifyFirstDigest = resolve;
  });
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let digestCalls = 0;
  const digestSpy = vi
    .spyOn(crypto.subtle, "digest")
    .mockImplementation(async (...args) => {
      digestCalls += 1;
      if (digestCalls === 1) {
        notifyFirstDigest?.();
        await firstDigestGate;
      }
      return digest(...args);
    });

  try {
    const opening = acquireExternalContentRoot({
      projectId: "project",
      assetId: sourceAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    });
    await firstDigestStarted;

    executeRuntimeMutation({
      id: "instances.updateProps",
      input: {
        updates: [
          {
            instanceId: "heading-template",
            name: "title",
            type: "string",
            value: "New",
          },
        ],
      },
    });

    await vi.waitFor(() => {
      const child = getExternalContentRootChildren({
        projectId: "project",
        blockInstanceId: "block",
        renderScope: '["block"]',
      })?.[0];
      if (child?.type !== "id") {
        throw new Error("Expected the refreshed heading");
      }
      expect(
        Array.from($props.get().values()).find(
          (prop) => prop.instanceId === child.value && prop.name === "title"
        )
      ).toMatchObject({ value: "New" });
    });

    releaseFirstDigest?.();
    releases.push(await opening);

    const child = getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })?.[0];
    if (child?.type !== "id") {
      throw new Error("Expected the materialized heading");
    }
    expect(
      Array.from($props.get().values()).find(
        (prop) => prop.instanceId === child.value && prop.name === "title"
      )
    ).toMatchObject({ value: "New" });
  } finally {
    releaseFirstDigest?.();
    digestSpy.mockRestore();
  }
});

test.each([
  {
    name: "keeps the selected JSX template when editing immediately after insertion",
    verifyFirstSaveCleanup: false,
  },
  {
    name: "clears insertion metadata after the first queued save",
    verifyFirstSaveCleanup: true,
  },
])("$name", async ({ verifyFirstSaveCleanup }) => {
  const initialSource = "# Existing\n";
  const sourceAsset = {
    ...asset,
    size: new TextEncoder().encode(initialSource).byteLength,
  };
  let storedSource = initialSource;
  const writes: string[] = [];
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: sourceAsset,
        data: (async function* () {
          yield new TextEncoder().encode(storedSource);
        })(),
      }),
      updateContent: async ({ data }) => {
        storedSource = await new Response(data).text();
        writes.push(storedSource);
        return {
          ...sourceAsset,
          size: new TextEncoder().encode(storedSource).byteLength,
        };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 60_000,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(
    createDefaultPages({ homePageId: "home", rootInstanceId: "block" })
  );
  selectPage("home");
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      [
        "templates",
        instance("templates", blockTemplateComponent, [
          { type: "id", value: "card" },
          { type: "id", value: "note" },
        ]),
      ],
      [
        "card",
        {
          ...instance("card", elementComponent, [
            { type: "text", value: "Card default" },
          ]),
          tag: "p",
          label: "Card",
        },
      ],
      [
        "note",
        {
          ...instance("note", elementComponent, [
            { type: "text", value: "Note default" },
          ]),
          tag: "p",
          label: "Note",
        },
      ],
    ])
  );
  $props.set(
    new Map<Prop["id"], Prop>([
      [
        "card-kind",
        {
          id: "card-kind",
          instanceId: "card",
          name: "data-kind",
          type: "string",
          value: "card",
        },
      ],
    ])
  );
  $assets.set(new Map([[sourceAsset.id, sourceAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
  $builderMode.set("content");

  const release = await acquireExternalContentRoot({
    projectId: "project",
    assetId: sourceAsset.id,
    blockInstanceId: "block",
    renderScope: '["block"]',
  });
  releases.push(release);
  const heading = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[0];
  if (heading?.type !== "id") {
    throw new Error("Expected the initial heading");
  }
  selectInstance([heading.value, "block"]);

  await expect(
    insertTemplateAt(
      ["card", "templates", "block"],
      [heading.value, "block"],
      false
    )
  ).resolves.toBe(true);
  const inserted = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[1];
  if (inserted?.type !== "id") {
    throw new Error("Expected the inserted Card");
  }

  if (verifyFirstSaveCleanup) {
    await vi.waitFor(() =>
      expect(
        getExternalContentRoots().values().next().value?.insertedTemplates
      ).toBeUndefined()
    );
    return;
  }

  await expect(
    insertTemplateAt(
      ["note", "templates", "block"],
      [inserted.value, "block"],
      false
    )
  ).resolves.toBe(true);
  const removedBeforeSave = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[2];
  if (removedBeforeSave?.type !== "id") {
    throw new Error("Expected the inserted Note");
  }
  executeRuntimeMutation({
    id: "instances.deleteBySelector",
    input: { instanceSelector: [removedBeforeSave.value, "block"] },
  });

  await Promise.resolve();
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: inserted.value,
      mode: "text",
      text: "Edited text",
    },
  });
  executeRuntimeMutation({
    id: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId: inserted.value,
          name: "title",
          type: "string",
          value: "Edited",
        },
      ],
    },
  });

  await flushExternalContentAsset({
    projectId: "project",
    assetId: sourceAsset.id,
  });
  expect(writes.at(-1)).toBe(
    '# Existing\n\n<Card title="Edited">Edited text</Card>\n'
  );
  expect(
    getExternalContentRoots().values().next().value?.insertedTemplates
  ).toBeUndefined();

  release();
  releases.splice(releases.indexOf(release), 1);
  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: sourceAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  );
  executeRuntimeMutation({
    id: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId: "card",
          name: "data-template-version",
          type: "string",
          value: "two",
        },
      ],
    },
  });
  await vi.waitFor(() => {
    const reloaded = getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })?.[1];
    if (reloaded?.type !== "id") {
      throw new Error("Expected the reloaded Card");
    }
    expect(
      Array.from($props.get().values()).find(
        (prop) =>
          prop.instanceId === reloaded.value &&
          prop.name === "data-template-version"
      )
    ).toMatchObject({ type: "string", value: "two" });
  });
});

test("rejects a stale raw editor replacement behind a newer queued edit", async () => {
  let continueCanvasEdit: (() => void) | undefined;
  const canvasEditGate = new Promise<void>((resolve) => {
    continueCanvasEdit = resolve;
  });
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset,
        data: (async function* () {
          yield new TextEncoder().encode("# Hello");
        })(),
      }),
      updateContent: async () => asset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  const requireReload = vi.fn();
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload,
      getContentSession: () => session,
    })
  );
  await session.open(asset.id);

  const canvasEdit = updateExternalContentAssetSource({
    projectId: "project",
    assetId: asset.id,
    update: async () => {
      await canvasEditGate;
      return "# Canvas";
    },
  });
  const staleEditorEdit = replaceExternalContentAssetSource({
    projectId: "project",
    assetId: asset.id,
    expectedSource: "# Hello",
    source: "# Editor",
  });

  continueCanvasEdit?.();
  await canvasEdit;
  await expect(staleEditorEdit).rejects.toThrow(
    "The MDX content source changed before the file edit was saved."
  );
  expect(session.get(asset.id)?.source).toBe("# Canvas");
  expect(requireReload).toHaveBeenCalledOnce();
});

test("rebases frontmatter edits from Content Blocks sharing one Asset", async () => {
  const initialSource = "---\ntitle: Before\n---\n\n# Article\n";
  const initialAsset = {
    ...asset,
    size: new TextEncoder().encode(initialSource).byteLength,
  };
  const writes: string[] = [];
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: initialAsset,
        data: (async function* () {
          yield new TextEncoder().encode(initialSource);
        })(),
      }),
      updateContent: async ({ data }) => {
        const source = await new Response(data).text();
        writes.push(source);
        return {
          ...initialAsset,
          size: new TextEncoder().encode(source).byteLength,
        };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 0,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
      [
        "block-2",
        instance("block-2", blockComponent, [
          { type: "id", value: "templates-2" },
        ]),
      ],
      ["templates-2", instance("templates-2", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[initialAsset.id, initialAsset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });

  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: initialAsset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    }),
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: initialAsset.id,
      blockInstanceId: "block-2",
      renderScope: '["block-2"]',
    })
  );
  const entries = Array.from(getExternalContentRoots());
  const firstKey = entries.find(
    ([, root]) => root.sourceBlockInstanceId === "block"
  )?.[0];
  const secondKey = entries.find(
    ([, root]) => root.sourceBlockInstanceId === "block-2"
  )?.[0];
  if (firstKey === undefined || secondKey === undefined) {
    throw new Error("Expected both shared Content Block roots");
  }

  await Promise.all([
    updateExternalContentFrontmatter({
      rootKey: firstKey,
      path: ["title"],
      value: "After",
    }),
    updateExternalContentFrontmatter({
      rootKey: secondKey,
      path: ["excerpt"],
      value: "Summary",
    }),
  ]);
  await flushExternalContentAsset({
    projectId: "project",
    assetId: initialAsset.id,
  });

  expect(writes.at(-1)).toBe(
    "---\nexcerpt: Summary\ntitle: After\n---\n\n# Article\n"
  );
});

test("does not install an Asset load after its Content Block unmounts", async () => {
  let finishRead: (() => void) | undefined;
  const waitForRead = new Promise<void>((resolve) => {
    finishRead = resolve;
  });
  const session = createAssetContentSession({
    repository: {
      readContent: async () => {
        await waitForRead;
        return {
          asset,
          data: (async function* () {
            yield new TextEncoder().encode("# Stale");
          })(),
        };
      },
      updateContent: async () => asset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $breakpoints.set(new Map());
  const controller = new AbortController();
  const opening = acquireExternalContentRoot({
    projectId: "project",
    assetId: asset.id,
    blockInstanceId: "block",
    renderScope: '["block"]',
    signal: controller.signal,
  });

  controller.abort();
  finishRead?.();
  releases.push(await opening);

  expect(
    getExternalContentRootSnapshot({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toBeUndefined();
});

test("replaces a mounted root when its source Asset changes", async () => {
  const secondAsset: Asset = {
    ...asset,
    id: "second-asset",
    name: "second.mdx",
    size: new TextEncoder().encode("# Second").byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async ({ assetId }) => ({
        asset: assetId === asset.id ? asset : secondAsset,
        data: (async function* () {
          yield new TextEncoder().encode(
            assetId === asset.id ? "# First" : "# Second"
          );
        })(),
      }),
      updateContent: async ({ assetId }) =>
        assetId === asset.id ? asset : secondAsset,
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(
    new Map<Asset["id"], Asset>([
      [asset.id, asset],
      [secondAsset.id, secondAsset],
    ])
  );
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $breakpoints.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  serverSyncStore.popAll();
  externalContentSyncStore.popAll();
  const renderScope = '["block"]';

  const releaseFirst = await acquireExternalContentRoot({
    projectId: "project",
    assetId: asset.id,
    blockInstanceId: "block",
    renderScope,
  });
  releaseFirst();
  const releaseSecond = await acquireExternalContentRoot({
    projectId: "project",
    assetId: secondAsset.id,
    blockInstanceId: "block",
    renderScope,
  });

  const child = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope,
  })?.[0];
  expect(child?.type).toBe("id");
  expect(
    child?.type === "id"
      ? $instances.get().get(child.value)?.children
      : undefined
  ).toEqual([{ type: "text", value: "Second" }]);

  $instances.set(
    new Map($instances.get())
      .set("ordinary", instance("ordinary", "ws:element", []))
      .set("block", {
        ...$instances.get().get("block")!,
        children: [child!, { type: "id", value: "ordinary" }],
      })
  );
  releaseSecond();

  expect($instances.get().get("block")?.children).toEqual([
    { type: "id", value: "ordinary" },
  ]);
  expect($instances.get().has("ordinary")).toBe(true);
});

test("installs MDX into the Body and recovers an invalid dependency", async () => {
  const source = `---
author:
  $ref: ./author.md#frontmatter
---

# Article body`;
  const authorSource = `---
name: Ada
avatar:
  $ref: ./avatar.jpg
---
`;
  const invalidAuthorSource = `---
name: Ada
name: Grace
role: author
role: editor
---
`;
  const authorAsset: Asset = {
    ...asset,
    id: "author",
    name: "author_v1.md",
    format: "md",
    size: new TextEncoder().encode(invalidAuthorSource).byteLength,
  };
  const avatarAsset: Asset = {
    id: "avatar",
    projectId: "project",
    name: "avatar_v1.jpg",
    type: "image",
    format: "jpg",
    size: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: { width: 100, height: 100 },
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async ({ assetId }) => ({
        asset:
          assetId === authorAsset.id
            ? authorAsset
            : { ...asset, size: new TextEncoder().encode(source).byteLength },
        data: (async function* () {
          yield new TextEncoder().encode(
            assetId === authorAsset.id ? invalidAuthorSource : source
          );
        })(),
      }),
      updateContent: async ({ assetId, data }) => {
        const updatedSource = await new Response(data).text();
        const currentAsset = assetId === authorAsset.id ? authorAsset : asset;
        return {
          ...currentAsset,
          size: new TextEncoder().encode(updatedSource).byteLength,
        };
      },
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [
          { type: "id", value: "header" },
          { type: "id", value: "body-outlet" },
          { type: "id", value: "footer" },
          { type: "id", value: "templates" },
        ]),
      ],
      ["header", instance("header", "ws:element", [])],
      ["body-outlet", instance("body-outlet", blockBodyComponent, [])],
      ["footer", instance("footer", "ws:element", [])],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(
    new Map<Asset["id"], Asset>([
      [asset.id, asset],
      [authorAsset.id, authorAsset],
      [avatarAsset.id, avatarAsset],
    ])
  );
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $breakpoints.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  serverSyncStore.popAll();
  externalContentSyncStore.popAll();

  const renderScope = '["block"]';
  const release = await acquireExternalContentRoot({
    projectId: "project",
    assetId: asset.id,
    blockInstanceId: "block",
    renderScope,
  });

  expect($instances.get().get("block")?.children).toEqual([
    { type: "id", value: "header" },
    { type: "id", value: "body-outlet" },
    { type: "id", value: "footer" },
    { type: "id", value: "templates" },
  ]);
  const [bodyChild] = $instances.get().get("body-outlet")?.children ?? [];
  expect(bodyChild?.type).toBe("id");
  expect(
    bodyChild?.type === "id"
      ? $instances.get().get(bodyChild.value)?.children
      : undefined
  ).toEqual([{ type: "text", value: "Article body" }]);
  expect(
    findExternalContentRoot(getExternalContentRoots(), "block", renderScope)
      ?.diagnostics
  ).toEqual([
    expect.objectContaining({
      severity: "error",
      message: expect.stringContaining("Map keys must be unique"),
    }),
    expect.objectContaining({
      severity: "error",
      message: expect.stringContaining("Map keys must be unique"),
    }),
  ]);

  session.save(authorAsset.id, authorSource);
  await flushExternalContentAsset({
    projectId: "project",
    assetId: authorAsset.id,
  });
  await vi.waitFor(() =>
    expect(
      findExternalContentRoot(getExternalContentRoots(), "block", renderScope)
        ?.frontmatter
    ).toEqual({
      author: {
        name: "Ada",
        avatar: expect.objectContaining({ id: avatarAsset.id }),
      },
    })
  );
  expect(
    getExternalContentRootAssets({
      projectId: "project",
      blockInstanceIds: new Set(["block"]),
    }).map(({ id }) => id)
  ).toEqual([asset.id, authorAsset.id, avatarAsset.id]);

  session.save(
    authorAsset.id,
    `---
name: Ada Lovelace
avatar:
  $ref: ./avatar.jpg
---
`
  );
  await flushExternalContentAsset({
    projectId: "project",
    assetId: authorAsset.id,
  });
  expect(
    findExternalContentRoot(getExternalContentRoots(), "block", renderScope)
      ?.frontmatter
  ).toEqual({
    author: {
      name: "Ada Lovelace",
      avatar: expect.objectContaining({ id: avatarAsset.id }),
    },
  });

  release();
  expect($instances.get().get("body-outlet")?.children).toEqual([]);
  expect($instances.get().has("header")).toBe(true);
  expect($instances.get().has("footer")).toBe(true);
});

test("keeps dynamic Collection occurrences isolated by render scope", async () => {
  const secondAsset: Asset = {
    ...asset,
    id: "second-asset",
    name: "second.mdx",
    size: new TextEncoder().encode("# Second").byteLength,
  };
  const sources = new Map([
    [asset.id, "# First"],
    [secondAsset.id, "# Second"],
  ]);
  const writes: Array<{ assetId: string; source: string }> = [];
  const session = createAssetContentSession({
    repository: {
      readContent: async ({ assetId }) => {
        const currentAsset = assetId === asset.id ? asset : secondAsset;
        const source = sources.get(assetId) ?? "";
        return {
          asset: currentAsset,
          data: (async function* () {
            yield new TextEncoder().encode(source);
          })(),
        };
      },
      updateContent: async ({ assetId, data }) => {
        const source = await new Response(data).text();
        sources.set(assetId, source);
        writes.push({ assetId, source });
        const currentAsset = assetId === asset.id ? asset : secondAsset;
        return {
          ...currentAsset,
          size: new TextEncoder().encode(source).byteLength,
        };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 0,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $instances.set(
    new Map([
      ["body", instance("body", "Body", [{ type: "id", value: "collection" }])],
      [
        "collection",
        instance("collection", "Collection", [{ type: "id", value: "block" }]),
      ],
      [
        "block",
        instance("block", blockComponent, [
          { type: "id", value: "shell" },
          { type: "id", value: "templates" },
        ]),
      ],
      [
        "shell",
        instance("shell", "ws:element", [{ type: "id", value: "body-outlet" }]),
      ],
      ["body-outlet", instance("body-outlet", blockBodyComponent, [])],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(
    new Map([
      [asset.id, asset],
      [secondAsset.id, secondAsset],
    ])
  );
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $breakpoints.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  serverSyncStore.popAll();
  externalContentSyncStore.popAll();

  const firstScope = '["block","collection[first]","collection","body"]';
  const secondScope = '["block","collection[second]","collection","body"]';
  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: asset.id,
      blockInstanceId: "block",
      renderScope: firstScope,
    })
  );
  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: secondAsset.id,
      blockInstanceId: "block",
      renderScope: secondScope,
    })
  );
  const firstRoot = findExternalContentRoot(
    getExternalContentRoots(),
    "block",
    firstScope
  );
  const secondRoot = findExternalContentRoot(
    getExternalContentRoots(),
    "block",
    secondScope
  );
  if (firstRoot === undefined || secondRoot === undefined) {
    throw new Error("Expected both dynamic Content Block roots");
  }
  expect(
    resolveExternalContentOccurrence({
      sourceInstance: $instances.get().get("body-outlet")!,
      sourceSelector: [
        "body-outlet",
        "shell",
        firstRoot.blockInstanceId,
        "collection[first]",
        "collection",
        "body",
      ],
      instances: $instances.get(),
      roots: getExternalContentRoots(),
    })?.instance.id
  ).toBe(firstRoot.contentInstanceId);
  expect(
    getExternalContentRootAssets({
      projectId: "project",
      blockInstanceIds: new Set(["block"]),
    }).map(({ id }) => id)
  ).toEqual([asset.id, secondAsset.id]);
  const firstHeading = $instances
    .get()
    .get(firstRoot.contentInstanceId ?? firstRoot.blockInstanceId)
    ?.children.at(0);
  const secondHeading = $instances
    .get()
    .get(secondRoot.contentInstanceId ?? secondRoot.blockInstanceId)
    ?.children.at(0);
  if (firstHeading?.type !== "id" || secondHeading?.type !== "id") {
    throw new Error("Expected both dynamic MDX headings");
  }
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: firstScope,
    })
  ).toEqual([firstHeading]);
  expect($instances.get().get(firstHeading.value)?.children).toEqual([
    { type: "text", value: "First" },
  ]);
  expect($instances.get().get(secondHeading.value)?.children).toEqual([
    { type: "text", value: "Second" },
  ]);

  selectInstance([
    firstHeading.value,
    firstRoot.contentInstanceId ?? "body-outlet",
    "shell",
    firstRoot.blockInstanceId,
    "collection[first]",
    "collection",
    "body",
  ]);
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: firstHeading.value,
      mode: "text",
      text: "Updated first",
    },
  });
  await flushExternalContentAsset({ projectId: "project", assetId: asset.id });

  expect(writes).toEqual([{ assetId: asset.id, source: "# Updated first\n" }]);
  expect($instances.get().get(secondHeading.value)?.children).toEqual([
    { type: "text", value: "Second" },
  ]);
});

test("finishes a queued canvas save after its external root is released", async () => {
  const writes: string[] = [];
  let continueUpdate: (() => void) | undefined;
  const updateGate = new Promise<void>((resolve) => {
    continueUpdate = resolve;
  });
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset,
        data: (async function* () {
          yield new TextEncoder().encode("# Hello");
        })(),
      }),
      updateContent: async ({ data }) => {
        const source = await new Response(data).text();
        writes.push(source);
        return { ...asset, size: new TextEncoder().encode(source).byteLength };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 0,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $pages.set(createDefaultPages({ rootInstanceId: "block" }));
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[asset.id, asset]]));
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $breakpoints.set(new Map());
  const release = await acquireExternalContentRoot({
    projectId: "project",
    assetId: asset.id,
    blockInstanceId: "block",
    renderScope: '["block"]',
  });
  const heading = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[0];
  if (heading?.type !== "id") {
    throw new Error("Expected a materialized heading");
  }
  const statuses: string[] = [];
  const unsubscribe = subscribeExternalContentAsset({
    projectId: "project",
    assetId: asset.id,
    listener: ({ status }) => statuses.push(status),
  });
  const blockingUpdate = updateExternalContentAssetSource({
    projectId: "project",
    assetId: asset.id,
    update: async (source) => {
      await updateGate;
      return source;
    },
  });
  selectInstance([heading.value, "block"]);
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: heading.value,
      mode: "text",
      text: "Stale update",
    },
  });

  release();
  continueUpdate?.();
  await blockingUpdate;
  await flushExternalContentAsset({ projectId: "project", assetId: asset.id });
  unsubscribe();

  expect(statuses).not.toContain("failed");
  expect(writes).toEqual(["# Stale update\n"]);
});

test("retains a failed queued update when project teardown cannot drain it", async () => {
  const teardownAsset: Asset = {
    ...asset,
    id: "teardown-asset",
    projectId: "teardown-project",
    size: new TextEncoder().encode("# Original").byteLength,
  };
  const writes: string[] = [];
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: teardownAsset,
        data: (async function* () {
          yield new TextEncoder().encode("# Original");
        })(),
      }),
      updateContent: async ({ data }) => {
        const source = await new Response(data).text();
        writes.push(source);
        return {
          ...teardownAsset,
          size: new TextEncoder().encode(source).byteLength,
        };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 0,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  await session.open(teardownAsset.id);
  let preparationFails = true;
  const update = () => {
    if (preparationFails) {
      throw new Error("Temporary serialization failure");
    }
    return "# Recovered";
  };

  await expect(
    updateExternalContentAssetSource({
      projectId: teardownAsset.projectId!,
      assetId: teardownAsset.id,
      update,
    })
  ).rejects.toThrow("Temporary serialization failure");
  await expect(
    disposeExternalContentProject({
      projectId: teardownAsset.projectId!,
      session,
    })
  ).rejects.toThrow("Temporary serialization failure");

  preparationFails = false;
  await retryExternalContentAsset({
    projectId: teardownAsset.projectId!,
    assetId: teardownAsset.id,
  });
  await flushExternalContentAsset({
    projectId: teardownAsset.projectId!,
    assetId: teardownAsset.id,
  });

  expect(writes).toEqual(["# Recovered"]);
  await disposeExternalContentProject({
    projectId: teardownAsset.projectId!,
    session,
  });
});

test("retains pending content when the repository write fails during teardown", async () => {
  const teardownAsset: Asset = {
    ...asset,
    id: "repository-failure-asset",
    projectId: "repository-failure-project",
    size: new TextEncoder().encode("# Original").byteLength,
  };
  const writes: string[] = [];
  let writeFails = true;
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: teardownAsset,
        data: (async function* () {
          yield new TextEncoder().encode("# Original");
        })(),
      }),
      updateContent: async ({ data }) => {
        const source = await new Response(data).text();
        if (writeFails) {
          throw new Error("Temporary repository failure");
        }
        writes.push(source);
        return {
          ...teardownAsset,
          size: new TextEncoder().encode(source).byteLength,
        };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 60_000,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  await session.open(teardownAsset.id);
  await updateExternalContentAssetSource({
    projectId: teardownAsset.projectId!,
    assetId: teardownAsset.id,
    update: () => "# Pending",
  });

  await expect(
    disposeExternalContentProject({
      projectId: teardownAsset.projectId!,
      session,
    })
  ).rejects.toThrow("Temporary repository failure");

  writeFails = false;
  await disposeExternalContentProject({
    projectId: teardownAsset.projectId!,
    session,
  });
  expect(writes).toEqual(["# Pending"]);
});

test("keeps drained queues when the project becomes active during teardown", async () => {
  const projectId = "reactivated-project";
  const source = "# Original";
  const reactivatedAsset = {
    ...asset,
    projectId,
    size: new TextEncoder().encode(source).byteLength,
  };
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset: reactivatedAsset,
        data: (async function* () {
          yield new TextEncoder().encode(source);
        })(),
      }),
      updateContent: async ({ data }) => ({
        ...reactivatedAsset,
        size: (await new Response(data).arrayBuffer()).byteLength,
      }),
    },
    authorize: () => true,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: vi.fn(),
      getContentSession: () => session,
    })
  );
  await session.open(asset.id);
  await updateExternalContentAssetSource({
    projectId,
    assetId: asset.id,
    update: () => "# Active again",
  });

  await expect(
    disposeExternalContentProject({
      projectId,
      session,
      shouldCleanup: () => false,
    })
  ).resolves.toBe(false);
  await expect(
    disposeExternalContentProject({ projectId, session })
  ).resolves.toBe(true);
});

test("materializes into normal instances and saves their synchronous mutations only to the Asset", async () => {
  const writes: string[] = [];
  const requireReload = vi.fn();
  let revision = 1;
  const session = createAssetContentSession({
    repository: {
      readContent: async () => ({
        asset,
        data: (async function* () {
          yield new TextEncoder().encode("# Hello");
        })(),
      }),
      updateContent: async ({ data }) => {
        const source = await new Response(data).text();
        writes.push(source);
        revision += 1;
        return {
          ...asset,
          name: `article_v${revision}.mdx`,
          size: new TextEncoder().encode(source).byteLength,
        };
      },
    },
    authorize: () => true,
    debounceMilliseconds: 0,
  });
  sessions.push(session);
  assetContentBridgeTesting.initBridge(
    createAssetContentBridge({
      origin: window.location.origin,
      request: fetch,
      authorize: () => true,
      requireReload,
      getContentSession: () => session,
    })
  );

  const pages = createDefaultPages({ rootInstanceId: "block" });
  $pages.set(pages);
  $project.set({ id: "project", title: "Project", domain: "" } as never);
  $instances.set(
    new Map([
      [
        "block",
        instance("block", blockComponent, [{ type: "id", value: "templates" }]),
      ],
      ["templates", instance("templates", blockTemplateComponent, [])],
      [
        "block-2",
        instance("block-2", blockComponent, [
          { type: "id", value: "templates-2" },
        ]),
      ],
      ["templates-2", instance("templates-2", blockTemplateComponent, [])],
      ["ordinary", instance("ordinary", "ws:element", [])],
    ])
  );
  $props.set(new Map());
  $assets.set(new Map([[asset.id, asset]]));
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  serverSyncStore.popAll();
  externalContentSyncStore.popAll();

  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: asset.id,
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  );
  releases.push(
    await acquireExternalContentRoot({
      projectId: "project",
      assetId: asset.id,
      blockInstanceId: "block-2",
      renderScope: '["block-2"]',
    })
  );

  const repeatedRenderScope =
    '["block","collection[first]","collection","body"]';
  const releaseRepeatedRoot = await acquireExternalContentRoot({
    projectId: "project",
    assetId: asset.id,
    blockInstanceId: "block",
    renderScope: repeatedRenderScope,
  });
  const repeatedRoot = findExternalContentRoot(
    getExternalContentRoots(),
    "block",
    repeatedRenderScope
  );
  if (repeatedRoot === undefined) {
    throw new Error("Expected a scoped repeated Content Block root");
  }
  expect(repeatedRoot.blockInstanceId).not.toBe("block");
  expect($instances.get().get("block")?.children).toEqual([
    { type: "id", value: "templates" },
    expect.objectContaining({ type: "id" }),
  ]);
  expect($instances.get().get(repeatedRoot.blockInstanceId)?.children).toEqual([
    { type: "id", value: "templates" },
    expect.objectContaining({ type: "id" }),
  ]);
  releaseRepeatedRoot();
  expect($instances.get().has(repeatedRoot.blockInstanceId)).toBe(false);
  expect($instances.get().get("block")?.children).toEqual([
    { type: "id", value: "templates" },
    expect.objectContaining({ type: "id" }),
  ]);

  const headingId = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.[0];
  if (headingId?.type !== "id") {
    throw new Error("Expected a materialized heading");
  }
  expect($instances.get().get("block")?.children).toEqual([
    { type: "id", value: "templates" },
    headingId,
  ]);
  const initialIdentity = getExternalContentRootSnapshot({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.identity;
  expect($instances.get().get(headingId.value)).toMatchObject({
    tag: "h1",
    children: [{ type: "text", value: "Hello" }],
  });

  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: headingId.value,
      mode: "text",
      text: "Updated",
    },
  });

  expect($instances.get().get(headingId.value)?.children).toEqual([
    { type: "text", value: "Updated" },
  ]);

  selectInstance([headingId.value, "block"]);
  const insertion = executeRuntimeMutation({
    id: "instances.insertComponent",
    input: {
      parentInstanceId: "block",
      component: "ws:element",
      tag: "h2",
    },
  });
  const insertedId = insertion?.result.rootInstanceIds[0];
  if (insertion === undefined || insertedId === undefined) {
    throw new Error("Expected an inserted heading");
  }
  expect(insertion.result.parentInstanceId).toBe("block");
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: insertedId,
      mode: "text",
      text: "Second",
    },
  });
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toEqual([
    { type: "id", value: headingId.value },
    { type: "id", value: insertedId },
  ]);
  expect($instances.get().get("block")?.children).toEqual([
    { type: "id", value: "templates" },
    { type: "id", value: headingId.value },
    { type: "id", value: insertedId },
  ]);
  expect(serverSyncStore.popAll()).toEqual([]);
  await flushExternalContentAsset({ projectId: "project", assetId: asset.id });
  await vi.waitFor(() => expect(writes).toEqual(["# Updated\n\n## Second\n"]));
  const savedIdentity = getExternalContentRootSnapshot({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  })?.identity;
  expect(savedIdentity?.contentRef).toBe("article_v2.mdx");
  expect(savedIdentity?.revision).not.toBe(initialIdentity?.revision);
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: insertedId,
      mode: "text",
      text: "Second after save",
    },
  });
  expect(serverSyncStore.popAll()).toEqual([]);
  await flushExternalContentAsset({ projectId: "project", assetId: asset.id });
  expect(writes.at(-1)).toBe("# Updated\n\n## Second after save\n");
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toEqual([
    { type: "id", value: headingId.value },
    { type: "id", value: insertedId },
  ]);

  const secondOccurrenceChildren = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block-2",
    renderScope: '["block-2"]',
  });
  const secondOccurrenceHeading = secondOccurrenceChildren?.[0];
  const secondOccurrenceSubheading = secondOccurrenceChildren?.[1];
  if (
    secondOccurrenceHeading?.type !== "id" ||
    secondOccurrenceSubheading?.type !== "id"
  ) {
    throw new Error("Expected both shared Asset occurrences to rematerialize");
  }

  selectInstance([headingId.value, "block"]);
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: headingId.value,
      mode: "text",
      text: "First occurrence",
    },
  });
  expect($instances.get().get(headingId.value)?.children).toEqual([
    { type: "text", value: "First occurrence" },
  ]);
  selectInstance([secondOccurrenceSubheading.value, "block-2"]);
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: secondOccurrenceSubheading.value,
      mode: "text",
      text: "Second occurrence",
    },
  });
  expect(
    $instances.get().get(secondOccurrenceSubheading.value)?.children
  ).toEqual([{ type: "text", value: "Second occurrence" }]);

  await flushExternalContentAsset({ projectId: "project", assetId: asset.id });
  expect(writes.at(-1)).toBe("# First occurrence\n\n## Second occurrence\n");
  expect(requireReload).not.toHaveBeenCalled();

  const firstOccurrenceChildren = getExternalContentRootChildren({
    projectId: "project",
    blockInstanceId: "block",
    renderScope: '["block"]',
  });
  const moved = firstOccurrenceChildren?.[1];
  if (moved?.type !== "id") {
    throw new Error("Expected a movable external child");
  }
  selectInstance([moved.value, "block"]);
  executeRuntimeMutation({
    id: "instances.move",
    input: {
      moves: [{ instanceId: moved.value, parentInstanceId: "ordinary" }],
    },
  });
  expect($instances.get().get("ordinary")?.children).toEqual([moved]);
  expect(serverSyncStore.popAll()).not.toEqual([]);

  selectInstance([moved.value, "ordinary"]);
  executeRuntimeMutation({
    id: "instances.move",
    input: { moves: [{ instanceId: moved.value, parentInstanceId: "block" }] },
  });
  expect($instances.get().get("ordinary")?.children).toEqual([]);
  expect(serverSyncStore.popAll()).not.toEqual([]);
  await flushExternalContentAsset({ projectId: "project", assetId: asset.id });
  expect(writes.at(-1)).toBe("# First occurrence\n\n## Second occurrence\n");

  session.save(asset.id, "<broken");
  await session.flush(asset.id);
  await vi.waitFor(() =>
    expect(
      getExternalContentRootChildren({
        projectId: "project",
        blockInstanceId: "block",
        renderScope: '["block"]',
      })
    ).toEqual([])
  );
  expect(
    getExternalContentRootSnapshot({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })?.diagnostics
  ).toEqual([
    expect.objectContaining({ code: "invalid-mdx", severity: "error" }),
  ]);
  selectInstance(["block"]);
  const localInsertion = executeRuntimeMutation({
    id: "instances.insertComponent",
    input: {
      parentInstanceId: "block",
      component: "ws:element",
      tag: "p",
    },
  });
  const localParagraphId = localInsertion?.result.rootInstanceIds[0];
  if (localParagraphId === undefined) {
    throw new Error("Expected a local paragraph");
  }
  executeRuntimeMutation({
    id: "instances.setTextContent",
    input: {
      operation: "set",
      instanceId: localParagraphId,
      mode: "text",
      text: "Local draft",
    },
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(
    getExternalContentRootChildren({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toEqual([{ type: "id", value: localParagraphId }]);
  expect($instances.get().has(localParagraphId)).toBe(true);

  await expect(
    flushExternalContentProject({ projectId: "project", session })
  ).rejects.toThrow(
    "The MDX content source must be structurally valid before canvas edits can be saved."
  );

  session.save(asset.id, "# Repaired");
  await session.flush(asset.id);
  await expect(
    retryExternalContentAsset({ projectId: "project", assetId: asset.id })
  ).rejects.toThrow(
    "The MDX content source changed before the edit was saved. Reload to continue."
  );
  expect(requireReload).toHaveBeenCalledWith(
    "The MDX content source changed before the edit was saved. Reload to continue."
  );
  expect(writes.at(-1)).toBe("# Repaired");
  expect($instances.get().get(localParagraphId)?.children).toEqual([
    { type: "text", value: "Local draft" },
  ]);
  await expect(
    disposeExternalContentProject({ projectId: "project", session })
  ).rejects.toThrow(
    "The MDX content source changed before the edit was saved. Reload to continue."
  );
  expect(
    getExternalContentRootSnapshot({
      projectId: "project",
      blockInstanceId: "block",
      renderScope: '["block"]',
    })
  ).toBeUndefined();
});
