import { describe, expect, expectTypeOf, test, vi } from "vitest";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  contentBlockSourceProp,
  elementComponent,
  type Asset,
  type Instance,
  type PageTemplate,
} from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  applyMdxContentStorageChanges,
  findCycles,
  materializeMdxAuthoredContent,
  prepareMdxContentStorageWrites,
  type ContentStorageChange,
  type MaterializedMdxAuthoredContentRoot,
} from "@webstudio-is/project-build/runtime";
import type { BuilderRuntimeOperationInput } from "@webstudio-is/project-build/runtime";
import {
  executeRuntimeMutation,
  executeRuntimeMutationAsync,
  executeRuntimeMutationSequence,
  $pendingTemplateNameConfirmation,
  abortPendingTemplateNameConfirmation,
  confirmPendingTemplateNameChange,
  getWebstudioData,
  migrateLoadedWebstudioData,
  type RuntimeMutationOperation,
} from "./data";
import { registerContainers, serverSyncStore } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $projectSettings,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";
import { $selectedPageId } from "../nano-states/pages";
import { $authPermit, $builderMode } from "../nano-states/misc";
import { selectInstance } from "../nano-states/instances";
import {
  publishMaterializedContentRoot,
  registerContentStorageSaver,
  resetMaterializedContent,
  $runtimeInstances,
  $materializedContentRoots,
  getMaterializedContentStatus,
} from "../content-block-content";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

registerContainers();

test("accepts only mutation operation ids in the Builder commit helpers", () => {
  expectTypeOf<
    Extract<RuntimeMutationOperation, { id: "pages.create" }>
  >().not.toBeNever();
  expectTypeOf<
    Extract<RuntimeMutationOperation, { id: "pages.list" }>
  >().toBeNever();
});

const setBaseStores = () => {
  abortPendingTemplateNameConfirmation();
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  const pages = createDefaultPages({ rootInstanceId: "body" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $builderMode.set("design");
  $authPermit.set("build");
  $instances.set(new Map([["body", createInstance("body", "Body", [])]]));
  $props.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $assets.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  return { pages };
};

const expectGeneratedId = (value: string | undefined, label: string) => {
  expect(value).toEqual(expect.any(String));
  if (value === undefined) {
    throw new Error(`Expected ${label} to be generated`);
  }
  return value;
};

const createImageAsset = (id: string): Asset => ({
  id,
  projectId: "project",
  size: 1,
  name: `${id}.png`,
  type: "image",
  format: "png",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: { width: 100, height: 100 },
});

const setNestedMaterializedTextStores = ({
  duplicateSiblings = false,
}: { duplicateSiblings?: boolean } = {}) => {
  setBaseStores();
  $builderMode.set("content");
  $instances.set(
    new Map([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "block" }]),
      ],
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
        ]),
      ],
      ["templates", createInstance("templates", blockTemplateComponent, [])],
    ])
  );
  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: contentBlockSourceProp,
          type: "asset" as const,
          value: "article",
        },
      ],
    ])
  );
  const renderScope = JSON.stringify(["block", "body"]);
  const paragraph = {
    ...createInstance("paragraph", elementComponent, [
      { type: "id", value: "strong" },
      { type: "id", value: "emphasis" },
    ]),
    tag: duplicateSiblings ? "ul" : "p",
  };
  const strong = {
    ...createInstance("strong", elementComponent, [
      { type: "text", value: duplicateSiblings ? "Same" : "Strong" },
    ]),
    tag: duplicateSiblings ? "li" : "strong",
  };
  const emphasis = {
    ...createInstance("emphasis", elementComponent, [
      { type: "text", value: duplicateSiblings ? "Same" : "Emphasis" },
    ]),
    tag: duplicateSiblings ? "li" : "em",
  };
  const root: MaterializedMdxAuthoredContentRoot = {
    identity: {
      blockInstanceId: "block",
      assetId: "article",
      revision: "sha256:one",
      contentRef: "article.mdx",
      format: "mdx",
      renderScope,
    },
    fragment: {
      children: [{ type: "id", value: "paragraph" }],
      instances: [paragraph, strong, emphasis],
      props: [],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
    },
    document: {
      frontmatter: { properties: {} },
      children: [
        {
          type: "element",
          syntax: "markdown",
          tag: duplicateSiblings ? "ul" : "p",
          props: [],
          children: [
            {
              type: "element",
              syntax: "markdown",
              tag: duplicateSiblings ? "li" : "strong",
              props: [],
              children: [
                {
                  type: "text",
                  value: duplicateSiblings ? "Same" : "Strong",
                },
              ],
            },
            {
              type: "element",
              syntax: "markdown",
              tag: duplicateSiblings ? "li" : "em",
              props: [],
              children: [
                {
                  type: "text",
                  value: duplicateSiblings ? "Same" : "Emphasis",
                },
              ],
            },
          ],
        },
      ],
    },
    provenance: {
      nodes: [
        {
          type: "element",
          path: [0],
          instanceId: "paragraph",
          assetProps: [],
        },
        {
          type: "element",
          path: [0, 0],
          instanceId: "strong",
          assetProps: [],
        },
        {
          type: "element",
          path: [0, 1],
          instanceId: "emphasis",
          assetProps: [],
        },
      ],
      unresolvedTemplates: [],
    },
  };
  publishMaterializedContentRoot(root);
  return { emphasis, paragraph, renderScope, root, strong };
};

describe("data store helpers", () => {
  test("getWebstudioData reads all instance-related stores", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([["body", createInstance("body", "Body", [])]]);
    $pages.set(pages);
    $instances.set(instances);
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());
    $projectSettings.set({ meta: {}, compiler: {} });

    expect(getWebstudioData()).toMatchObject({
      pages,
      instances,
    });
  });

  test("executes runtime mutations against builder stores", () => {
    setBaseStores();

    const result = executeRuntimeMutation({
      id: "instances.updateProps",
      input: {
        updates: [
          {
            instanceId: "body",
            name: "id",
            type: "string",
            value: "main",
          },
        ],
      },
    });

    expect(result?.result.propIds).toHaveLength(1);
    expect(Array.from($props.get().values())).toEqual([
      expect.objectContaining({
        instanceId: "body",
        name: "id",
        type: "string",
        value: "main",
      }),
    ]);
  });

  test("requires and revalidates confirmation for a source-backed template rename", () => {
    setBaseStores();
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", blockComponent, [
            { type: "id", value: "templates" },
          ]),
        ],
        [
          "templates",
          createInstance("templates", blockTemplateComponent, [
            { type: "id", value: "card" },
          ]),
        ],
        ["card", createInstance("card", "Box", [])],
      ])
    );
    $props.set(
      new Map([
        [
          "src",
          {
            id: "src",
            instanceId: "block",
            name: contentBlockSourceProp,
            type: "asset" as const,
            value: "article.mdx",
          },
        ],
      ])
    );

    expect(
      executeRuntimeMutation({
        id: "instances.setLabel",
        input: { instanceId: "card", label: "Hero Card" },
      })
    ).toBeUndefined();
    expect($instances.get().get("card")?.label).toBeUndefined();
    expect($pendingTemplateNameConfirmation.get()?.confirmation).toEqual({
      action: "rename",
      templates: [{ instanceId: "card", oldName: "Box", newName: "Hero Card" }],
    });

    abortPendingTemplateNameConfirmation();
    expect($instances.get().get("card")?.label).toBeUndefined();

    executeRuntimeMutation({
      id: "instances.setLabel",
      input: { instanceId: "card", label: "Hero Card" },
    });
    const current = $instances.get();
    current.set("card", { ...current.get("card")!, label: "Current Card" });
    $instances.set(new Map(current));
    confirmPendingTemplateNameChange();
    expect($instances.get().get("card")?.label).toBe("Current Card");
    expect(
      $pendingTemplateNameConfirmation.get()?.confirmation.templates[0]?.oldName
    ).toBe("Current Card");

    confirmPendingTemplateNameChange();
    expect($instances.get().get("card")?.label).toBe("Hero Card");
    expect($pendingTemplateNameConfirmation.get()).toBeUndefined();

    expect(
      executeRuntimeMutation({
        id: "instances.delete",
        input: { instanceIds: ["card"] },
      })
    ).toBeUndefined();
    expect($pendingTemplateNameConfirmation.get()?.confirmation).toEqual({
      action: "delete",
      templates: [{ instanceId: "card", oldName: "Hero Card" }],
    });
    expect($instances.get().has("card")).toBe(true);
    confirmPendingTemplateNameChange();
    expect($instances.get().has("card")).toBe(false);
  });

  test("commits runtime patch payloads with sync undo and redo support", () => {
    setBaseStores();

    executeRuntimeMutation({
      id: "instances.updateProps",
      input: {
        updates: [
          {
            instanceId: "body",
            name: "id",
            type: "string",
            value: "main",
          },
        ],
      },
    });
    const [prop] = Array.from($props.get().values());
    expect(prop).toEqual(
      expect.objectContaining({
        instanceId: "body",
        name: "id",
        value: "main",
      })
    );

    serverSyncStore.undo();
    expect($props.get()).toEqual(new Map());

    serverSyncStore.redo();
    expect(Array.from($props.get().values())).toEqual([
      expect.objectContaining({
        instanceId: "body",
        name: "id",
        value: "main",
      }),
    ]);
  });

  test("commits a runtime mutation sequence as one undoable transaction", () => {
    setBaseStores();

    executeRuntimeMutationSequence([
      {
        id: "instances.updateProps",
        input: {
          updates: [
            {
              instanceId: "body",
              name: "id",
              type: "string",
              value: "main",
            },
          ],
        },
      },
      {
        id: "instances.updateProps",
        input: {
          updates: [
            {
              instanceId: "body",
              name: "title",
              type: "string",
              value: "Main content",
            },
          ],
        },
      },
    ]);

    expect(Array.from($props.get().values())).toHaveLength(2);
    serverSyncStore.undo();
    expect($props.get()).toEqual(new Map());
    serverSyncStore.redo();
    expect(Array.from($props.get().values())).toHaveLength(2);
  });

  test("runtime bridge keeps sync changes scoped to changed namespaces", () => {
    setBaseStores();
    serverSyncStore.popAll();

    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "body",
        mode: "text",
        text: "Hello",
      },
    });

    expect(
      serverSyncStore
        .popAll()
        .flatMap((item) => item.changes.map((change) => change.namespace))
    ).toEqual(["instances"]);
  });

  test("runtime bridge preserves parent record add patches from runtime payloads", () => {
    const { pages } = setBaseStores();
    pages.pageTemplates = new Map([
      [
        "template",
        {
          id: "template",
          name: "Template",
          title: JSON.stringify("Template"),
          rootInstanceId: "template-root",
          meta: {
            socialImageUrl: JSON.stringify(""),
            custom: [
              { property: "template", content: JSON.stringify("content") },
            ],
          },
        },
      ],
    ]);
    $instances.set(
      new Map([
        ["body", createInstance("body", "Body", [])],
        [
          "template-root",
          {
            type: "instance",
            id: "template-root",
            component: "ws:element",
            tag: "body",
            children: [],
          },
        ],
      ])
    );
    serverSyncStore.popAll();

    const result = executeRuntimeMutation({
      id: "pageTemplates.createPage",
      input: {
        projectId: "project",
        templateId: "template",
        parentFolderId: pages.rootFolderId,
        name: "Created from template",
        path: "/created-from-template",
        contentMode: true,
      },
    });
    const pageId = expectGeneratedId(result?.result.pageId, "page id");

    const pagesChange = serverSyncStore
      .popAll()
      .flatMap((item) => item.changes)
      .find((change) => change.namespace === "pages");
    expect(pagesChange).toBeDefined();
    if (pagesChange === undefined) {
      throw new Error("Expected pages change");
    }
    expect(pagesChange.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: "add", path: ["pages", pageId] }),
      ])
    );
    expect(pagesChange.revisePatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: "remove", path: ["pages", pageId] }),
      ])
    );

    const getSyncedPages = () => {
      const syncedPages = $pages.get();
      expect(syncedPages).toBeDefined();
      return syncedPages;
    };
    if (getSyncedPages() === undefined) {
      throw new Error("Expected pages to be loaded");
    }

    expect(getSyncedPages()?.pages.has(pageId)).toEqual(true);
    serverSyncStore.undo();
    expect(getSyncedPages()?.pages.has(pageId)).toEqual(false);
    serverSyncStore.redo();
    expect(getSyncedPages()?.pages.has(pageId)).toEqual(true);
  });

  test("runtime bridge moves page tree items with sync undo and redo support", () => {
    const { pages } = setBaseStores();
    const rootFolder = pages.folders.get(pages.rootFolderId);
    if (rootFolder === undefined) {
      throw new Error("Expected root folder");
    }
    pages.pages.set("page-a", {
      id: "page-a",
      name: "Page A",
      path: "/page-a",
      title: JSON.stringify("Page A"),
      meta: {},
      rootInstanceId: "body",
    });
    pages.pages.set("page-b", {
      id: "page-b",
      name: "Page B",
      path: "/page-b",
      title: JSON.stringify("Page B"),
      meta: {},
      rootInstanceId: "body",
    });
    pages.folders.set("folder", {
      id: "folder",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    rootFolder.children.push("page-a", "page-b", "folder");
    serverSyncStore.popAll();

    executeRuntimeMutation({
      id: "pageTree.move",
      input: {
        childId: "page-b",
        parentFolderId: "folder",
        position: 0,
      },
    });

    expect($pages.get()?.folders.get(pages.rootFolderId)?.children).toEqual([
      pages.homePageId,
      "page-a",
      "folder",
    ]);
    expect($pages.get()?.folders.get("folder")?.children).toEqual(["page-b"]);

    const pageTreeChanges = serverSyncStore
      .popAll()
      .flatMap((item) => item.changes)
      .filter((change) => change.namespace === "pages");
    expect(pageTreeChanges).toHaveLength(1);

    serverSyncStore.undo();
    expect($pages.get()?.folders.get(pages.rootFolderId)?.children).toEqual([
      pages.homePageId,
      "page-a",
      "page-b",
      "folder",
    ]);
    expect($pages.get()?.folders.get("folder")?.children).toEqual([]);

    serverSyncStore.redo();
    expect($pages.get()?.folders.get(pages.rootFolderId)?.children).toEqual([
      pages.homePageId,
      "page-a",
      "folder",
    ]);
    expect($pages.get()?.folders.get("folder")?.children).toEqual(["page-b"]);
  });

  test("runtime bridge reorders page templates with sync undo and redo support", () => {
    const { pages } = setBaseStores();
    pages.pageTemplates = new Map(
      ["first", "second", "third"].map((id) => [
        id,
        {
          id,
          name: id,
          title: JSON.stringify(id),
          rootInstanceId: "body",
          meta: {},
        },
      ])
    );
    serverSyncStore.popAll();

    executeRuntimeMutation({
      id: "pageTemplates.reorder",
      input: {
        sourceTemplateId: "third",
        targetTemplateId: "first",
        position: "before",
      },
    });

    expect(Array.from($pages.get()?.pageTemplates?.keys() ?? [])).toEqual([
      "third",
      "first",
      "second",
    ]);

    const templateChanges = serverSyncStore
      .popAll()
      .flatMap((item) => item.changes)
      .filter((change) => change.namespace === "pages");
    expect(templateChanges).toHaveLength(1);

    serverSyncStore.undo();
    expect(Array.from($pages.get()?.pageTemplates?.keys() ?? [])).toEqual([
      "first",
      "second",
      "third",
    ]);

    serverSyncStore.redo();
    expect(Array.from($pages.get()?.pageTemplates?.keys() ?? [])).toEqual([
      "third",
      "first",
      "second",
    ]);
  });

  test("uses runtime mutation input validation before updating stores", () => {
    setBaseStores();

    const invalidInput = {
      updates: [
        {
          instanceId: "body",
          name: "id",
          type: "number",
          value: "not-a-number",
        },
      ],
    } as unknown as BuilderRuntimeOperationInput<"instances.updateProps">;

    expect(() =>
      executeRuntimeMutation({
        id: "instances.updateProps",
        input: invalidInput,
      })
    ).toThrow();

    expect($props.get()).toEqual(new Map());
  });

  test("executes async runtime mutations against builder stores", async () => {
    setBaseStores();

    const result = await executeRuntimeMutationAsync({
      id: "instances.insertComponent",
      input: {
        parentInstanceId: "body",
        component: "ws:element",
        tag: "div",
      },
    });

    const rootInstanceId = expectGeneratedId(
      result?.result.rootInstanceIds[0],
      "root instance id"
    );
    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: rootInstanceId },
    ]);
    expect($instances.get().get(rootInstanceId)).toMatchObject({
      component: "ws:element",
      tag: "div",
    });
  });

  test("awaits intrinsically async runtime mutations before committing", async () => {
    setBaseStores();

    const result = await executeRuntimeMutationAsync({
      id: "instances.insertMdxText",
      input: {
        parentInstanceId: "body",
        source: "# Inserted heading",
      },
    });

    const rootInstanceId = expectGeneratedId(
      result?.result.rootInstanceIds[0],
      "inserted MDX root instance id"
    );
    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: rootInstanceId },
    ]);
    expect($instances.get().get(rootInstanceId)).toMatchObject({
      component: "ws:element",
      tag: "h1",
      children: [{ type: "text", value: "Inserted heading" }],
    });
  });

  test("rejects an async runtime result planned against stale project stores", async () => {
    setBaseStores();

    const insertion = executeRuntimeMutationAsync({
      id: "instances.insertMdxText",
      input: {
        parentInstanceId: "body",
        source: "# Stale heading",
      },
    });
    executeRuntimeMutation({
      id: "projectSettings.update",
      input: { compiler: { atomicStyles: true } },
    });

    await expect(insertion).resolves.toBeUndefined();
    expect($instances.get().get("body")?.children).toEqual([]);
    expect($projectSettings.get()?.compiler.atomicStyles).toBe(true);
  });

  test("blocks edits to transient instances until persisted IDs are materialized", async () => {
    setBaseStores();
    $builderMode.set("content");
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", "ws:block", [
            { type: "id", value: "templates" },
          ]),
        ],
        ["templates", createInstance("templates", "ws:block-template", [])],
      ])
    );
    $props.set(
      new Map([
        [
          "source",
          {
            id: "source",
            instanceId: "block",
            name: "src",
            type: "asset" as const,
            value: "article",
          },
        ],
      ])
    );
    const renderScope = JSON.stringify(["block", "body"]);
    const root: MaterializedMdxAuthoredContentRoot = {
      identity: {
        blockInstanceId: "block",
        assetId: "article",
        revision: "sha256:empty",
        contentRef: "article.mdx",
        format: "mdx",
        renderScope,
      },
      fragment: {
        children: [],
        instances: [],
        props: [],
        assets: [],
        dataSources: [],
        resources: [],
        breakpoints: [],
        styleSourceSelections: [],
        styleSources: [],
        styles: [],
      },
      document: { frontmatter: { properties: {} }, children: [] },
      provenance: { nodes: [], unresolvedTemplates: [] },
    };
    publishMaterializedContentRoot(root);
    let persistedRoot = root;
    let saveCount = 0;
    let finishFirstSave!: () => void;
    const firstSave = new Promise<void>((resolve) => {
      finishFirstSave = resolve;
    });
    let finishFirstTextTreeSave!: () => void;
    const firstTextTreeSave = new Promise<void>((resolve) => {
      finishFirstTextTreeSave = resolve;
    });
    let finishSecondTextTreeSave!: () => void;
    const secondTextTreeSave = new Promise<void>((resolve) => {
      finishSecondTextTreeSave = resolve;
    });
    let finishThirdTextTreeSave!: () => void;
    const thirdTextTreeSave = new Promise<void>((resolve) => {
      finishThirdTextTreeSave = resolve;
    });
    const save = vi.fn(async (changes: readonly ContentStorageChange[]) => {
      saveCount += 1;
      if (saveCount === 1) {
        await firstSave;
      }
      if (saveCount === 3) {
        await firstTextTreeSave;
      }
      if (saveCount === 4) {
        await secondTextTreeSave;
      }
      if (saveCount === 5) {
        await thirdTextTreeSave;
      }
      const [write] = await prepareMdxContentStorageWrites({
        loadedRoots: [persistedRoot],
        changes,
        authorizeAssetWrite: () => true,
      });
      if (write === undefined) {
        throw new Error("Expected an MDX storage write");
      }
      persistedRoot = materializeMdxAuthoredContent({
        identity: {
          ...persistedRoot.identity,
          revision: `sha256:saved-${saveCount}`,
        },
        document: await parseMdxDocument({ source: write.source }),
        templateMaterialization: {
          templates: [],
          diagnostics: [],
          dependencies: { templateNames: [], templates: [] },
        },
      });
      publishMaterializedContentRoot(persistedRoot);
      return { status: "applied" as const };
    });
    const unregister = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save,
    });
    selectInstance(["block", "body"]);

    const insertion = executeRuntimeMutationAsync({
      id: "instances.insertMdxText",
      input: { parentInstanceId: "block", source: "# Inserted" },
      context: { materializedContent: [root] },
    });
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    const transientChild = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", renderScope]))?.fragment.children[0];
    if (transientChild?.type !== "id") {
      throw new Error("Expected a transient inserted instance");
    }
    const transientInstanceId = transientChild.value;
    selectInstance([transientInstanceId, "block", "body"]);
    const transientRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", renderScope]));
    const transientInstance = $runtimeInstances.get().get(transientInstanceId);
    if (transientRoot === undefined || transientInstance === undefined) {
      throw new Error("Expected transient materialized content");
    }
    await expect(
      executeRuntimeMutationAsync({
        id: "instances.updateTextTree",
        input: {
          rootInstanceId: transientInstanceId,
          instances: [
            {
              ...transientInstance,
              children: [{ type: "text", value: "Must also wait" }],
            },
          ],
        },
        context: { materializedContent: [transientRoot] },
      })
    ).resolves.toBeUndefined();
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: transientInstanceId,
        mode: "text",
        text: "Must wait",
      },
    });
    expect($runtimeInstances.get().get(transientInstanceId)?.children).toEqual([
      { type: "text", value: "Inserted" },
    ]);
    expect(save).toHaveBeenCalledOnce();

    finishFirstSave();
    await expect(insertion).resolves.toBeDefined();
    const persistedChild = persistedRoot.fragment.children[0];
    if (persistedChild?.type !== "id") {
      throw new Error("Expected a persisted inserted instance");
    }
    expect(persistedChild.value).not.toBe(transientInstanceId);
    selectInstance([persistedChild.value, "block", "body"]);
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: persistedChild.value,
        mode: "text",
        text: "After save",
      },
    });
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect($runtimeInstances.get().get(persistedChild.value)?.children).toEqual(
      [{ type: "text", value: "After save" }]
    );
    const persistedTextInstance = $runtimeInstances
      .get()
      .get(persistedChild.value);
    if (persistedTextInstance === undefined) {
      throw new Error("Expected the persisted text instance");
    }

    const firstTextTreeChange = executeRuntimeMutationAsync({
      id: "instances.updateTextTree",
      input: {
        rootInstanceId: persistedChild.value,
        instances: [
          {
            ...persistedTextInstance,
            children: [{ type: "id", value: "temporary-strong" }],
          },
          {
            type: "instance",
            id: "temporary-strong",
            component: "ws:element",
            tag: "strong",
            children: [{ type: "text", value: "First" }],
          },
        ],
      },
      context: {
        materializedContent: [persistedRoot],
      },
    });
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    const optimisticStrongChild = $runtimeInstances
      .get()
      .get(persistedChild.value)?.children[0];
    if (optimisticStrongChild?.type !== "id") {
      throw new Error("Expected an optimistic text-tree instance");
    }
    const optimisticStrong = $runtimeInstances
      .get()
      .get(optimisticStrongChild.value);
    if (optimisticStrong === undefined) {
      throw new Error("Expected an optimistic strong instance");
    }
    const optimisticTextInstance = $runtimeInstances
      .get()
      .get(persistedChild.value);
    const optimisticRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", renderScope]));
    if (optimisticTextInstance === undefined || optimisticRoot === undefined) {
      throw new Error("Expected optimistic materialized content");
    }
    const secondTextTreeChange = executeRuntimeMutationAsync({
      id: "instances.updateTextTree",
      input: {
        rootInstanceId: persistedChild.value,
        instances: [
          {
            ...optimisticTextInstance,
            children: [
              { type: "id", value: optimisticStrongChild.value },
              { type: "id", value: "temporary-emphasis" },
            ],
          },
          {
            ...optimisticStrong,
            children: [{ type: "text", value: "Second" }],
          },
          {
            type: "instance",
            id: "temporary-emphasis",
            component: "ws:element",
            tag: "em",
            children: [{ type: "text", value: "Emphasis" }],
          },
        ],
      },
      context: {
        materializedContent: [optimisticRoot],
      },
    });
    expect(
      $runtimeInstances.get().get(optimisticStrongChild.value)?.children
    ).toEqual([{ type: "text", value: "Second" }]);
    expect(save).toHaveBeenCalledTimes(3);
    const secondOptimisticTextInstance = $runtimeInstances
      .get()
      .get(persistedChild.value);
    const optimisticEmphasisChild = secondOptimisticTextInstance?.children[1];
    const optimisticEmphasis =
      optimisticEmphasisChild?.type === "id"
        ? $runtimeInstances.get().get(optimisticEmphasisChild.value)
        : undefined;
    if (
      secondOptimisticTextInstance === undefined ||
      optimisticEmphasis === undefined
    ) {
      throw new Error("Expected the second optimistic text tree");
    }
    const thirdTextTreeChange = executeRuntimeMutationAsync({
      id: "instances.updateTextTree",
      input: {
        rootInstanceId: persistedChild.value,
        instances: [
          {
            ...secondOptimisticTextInstance,
            children: [
              ...secondOptimisticTextInstance.children,
              { type: "id", value: "temporary-code" },
            ],
          },
          {
            ...optimisticStrong,
            children: [{ type: "text", value: "Third" }],
          },
          {
            ...optimisticEmphasis,
            children: [{ type: "text", value: "Third emphasis" }],
          },
          {
            type: "instance",
            id: "temporary-code",
            component: "ws:element",
            tag: "code",
            children: [{ type: "text", value: "Code" }],
          },
        ],
      },
      context: { materializedContent: [optimisticRoot] },
    });
    expect(
      $runtimeInstances.get().get(optimisticStrongChild.value)?.children
    ).toEqual([{ type: "text", value: "Third" }]);
    executeRuntimeMutation({
      id: "instances.deleteBySelector",
      input: {
        instanceSelector: [
          optimisticStrongChild.value,
          persistedChild.value,
          "block",
          "body",
        ],
      },
    });
    expect($runtimeInstances.get().has(optimisticStrongChild.value)).toBe(true);
    expect(save).toHaveBeenCalledTimes(3);
    finishFirstTextTreeSave();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(4));
    const currentStrongChild = $runtimeInstances.get().get(persistedChild.value)
      ?.children[0];
    if (currentStrongChild?.type !== "id") {
      throw new Error("Expected a current text-tree instance");
    }
    expect(
      $runtimeInstances.get().get(currentStrongChild.value)?.children
    ).toEqual([{ type: "text", value: "Third" }]);
    executeRuntimeMutation({
      id: "instances.deleteBySelector",
      input: {
        instanceSelector: [
          currentStrongChild.value,
          persistedChild.value,
          "block",
          "body",
        ],
      },
    });
    expect($runtimeInstances.get().has(currentStrongChild.value)).toBe(true);
    expect(save).toHaveBeenCalledTimes(4);
    finishSecondTextTreeSave();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(5));
    const latestStrongChild = $runtimeInstances.get().get(persistedChild.value)
      ?.children[0];
    if (latestStrongChild?.type !== "id") {
      throw new Error("Expected the latest text-tree instance");
    }
    executeRuntimeMutation({
      id: "instances.deleteBySelector",
      input: {
        instanceSelector: [
          latestStrongChild.value,
          persistedChild.value,
          "block",
          "body",
        ],
      },
    });
    expect($runtimeInstances.get().has(latestStrongChild.value)).toBe(true);
    expect(save).toHaveBeenCalledTimes(5);
    finishThirdTextTreeSave();
    await expect(
      Promise.all([
        firstTextTreeChange,
        secondTextTreeChange,
        thirdTextTreeChange,
      ])
    ).resolves.toHaveLength(3);

    unregister();
    let finishFailedSave!: () => void;
    const failedSave = new Promise<void>((resolve) => {
      finishFailedSave = resolve;
    });
    const unregisterFailure = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: async () => {
        await failedSave;
        return { status: "blocked", message: "Expected save failure" };
      },
    });
    const failedInsertion = executeRuntimeMutationAsync({
      id: "instances.insertMdxText",
      input: { parentInstanceId: "block", source: "Another paragraph" },
    });
    await vi.waitFor(() =>
      expect(
        getMaterializedContentStatus({
          blockInstanceId: "block",
          renderScope,
        })
      ).toBe("pending")
    );
    finishFailedSave();
    await expect(failedInsertion).resolves.toBeUndefined();
    unregisterFailure();
    publishMaterializedContentRoot(persistedRoot);
    const saveAfterFailure = vi.fn(async () => ({
      status: "applied" as const,
    }));
    const unregisterAfterFailure = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: saveAfterFailure,
    });
    await executeRuntimeMutationAsync({
      id: "instances.insertMdxText",
      input: { parentInstanceId: "block", source: "After failed insertion" },
      context: { materializedContent: [persistedRoot] },
    });
    await vi.waitFor(() => expect(saveAfterFailure).toHaveBeenCalledOnce());
    unregisterAfterFailure();

    resetMaterializedContent();
    $builderMode.set("design");
  });

  test.each([
    {
      name: "removal",
      children: [{ type: "id" as const, value: "emphasis" }],
      instances: ["paragraph", "emphasis"],
    },
    {
      name: "reorder",
      children: [
        { type: "id" as const, value: "emphasis" },
        { type: "id" as const, value: "strong" },
      ],
      instances: ["paragraph", "emphasis", "strong"],
    },
  ])(
    "blocks unrelated authored mutations during a rich-text $name",
    async ({ children, instances: updatedInstanceIds }) => {
      const { emphasis, paragraph, renderScope, root, strong } =
        setNestedMaterializedTextStores();
      let finishSave!: () => void;
      const pendingSave = new Promise<void>((resolve) => {
        finishSave = resolve;
      });
      const save = vi.fn(async () => {
        await pendingSave;
        return { status: "applied" as const };
      });
      const unregister = registerContentStorageSaver({
        blockInstanceId: "block",
        renderScope,
        preflight: async () => ({ status: "applied" }),
        isCurrent: () => true,
        save,
      });
      const updatedInstances = [paragraph, emphasis, strong]
        .filter(({ id }) => updatedInstanceIds.includes(id))
        .map((instance) =>
          instance.id === "paragraph" ? { ...instance, children } : instance
        );
      const edit = executeRuntimeMutationAsync({
        id: "instances.updateTextTree",
        input: { rootInstanceId: "paragraph", instances: updatedInstances },
        context: { materializedContent: [root] },
      });
      await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
      selectInstance(["emphasis", "paragraph", "block", "body"]);

      executeRuntimeMutation({
        id: "instances.deleteBySelector",
        input: {
          instanceSelector: ["emphasis", "paragraph", "block", "body"],
        },
      });

      expect($runtimeInstances.get().has("emphasis")).toBe(true);
      expect(save).toHaveBeenCalledOnce();
      finishSave();
      await edit;
      unregister();
      resetMaterializedContent();
    }
  );

  test("blocks stale sibling mutations while an authored deletion rematerializes IDs", async () => {
    const { renderScope, root } = setNestedMaterializedTextStores();
    let finishSave!: () => void;
    const pendingSave = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const save = vi.fn(async () => {
      await pendingSave;
      return { status: "applied" as const };
    });
    const unregister = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save,
    });
    const deletion = executeRuntimeMutationAsync({
      id: "instances.deleteBySelector",
      input: {
        instanceSelector: ["strong", "paragraph", "block", "body"],
      },
      context: { materializedContent: [root] },
    });
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    selectInstance(["emphasis", "paragraph", "block", "body"]);

    executeRuntimeMutation({
      id: "instances.deleteBySelector",
      input: {
        instanceSelector: ["emphasis", "paragraph", "block", "body"],
      },
    });

    const siblingMutationWasBlocked = $runtimeInstances.get().has("emphasis");
    finishSave();
    await deletion;
    if (siblingMutationWasBlocked === false) {
      await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    }
    unregister();
    resetMaterializedContent();

    expect(siblingMutationWasBlocked).toBe(true);
    expect(save).toHaveBeenCalledOnce();
  });

  test("rebases rich-text IDs behind a nested authored reorder", async () => {
    const { emphasis, renderScope, root } = setNestedMaterializedTextStores({
      duplicateSiblings: true,
    });
    let persistedRoot = root;
    let finishFirstSave!: () => void;
    const firstSave = new Promise<void>((resolve) => {
      finishFirstSave = resolve;
    });
    let saveCount = 0;
    const save = vi.fn(async (changes: readonly ContentStorageChange[]) => {
      saveCount += 1;
      if (saveCount === 1) {
        await firstSave;
      }
      const [write] = await prepareMdxContentStorageWrites({
        loadedRoots: [persistedRoot],
        changes,
        authorizeAssetWrite: () => true,
      });
      if (write === undefined) {
        throw new Error("Expected an MDX storage write");
      }
      persistedRoot = materializeMdxAuthoredContent({
        identity: {
          ...persistedRoot.identity,
          revision: `sha256:reordered-${saveCount}`,
        },
        document: await parseMdxDocument({ source: write.source }),
        templateMaterialization: {
          templates: [],
          diagnostics: [],
          dependencies: { templateNames: [], templates: [] },
        },
      });
      publishMaterializedContentRoot(persistedRoot);
      return { status: "applied" as const };
    });
    const unregister = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save,
    });

    const reorder = executeRuntimeMutationAsync({
      id: "instances.reparent",
      input: {
        sourceInstanceSelector: ["strong", "paragraph", "block", "body"],
        dropTarget: {
          parentSelector: ["paragraph", "block", "body"],
          position: "end",
        },
      },
      context: { materializedContent: [root] },
    });
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    const optimisticRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", renderScope]));
    if (optimisticRoot === undefined) {
      throw new Error("Expected optimistic reordered content");
    }
    const textEdit = executeRuntimeMutationAsync({
      id: "instances.updateTextTree",
      input: {
        rootInstanceId: emphasis.id,
        instances: [
          {
            ...emphasis,
            children: [{ type: "text", value: "Updated" }],
          },
        ],
      },
      context: { materializedContent: [optimisticRoot] },
    });
    finishFirstSave();
    await expect(Promise.all([reorder, textEdit])).resolves.toHaveLength(2);
    expect(save).toHaveBeenCalledTimes(2);

    const instances = new Map(
      persistedRoot.fragment.instances.map((instance) => [
        instance.id,
        instance,
      ])
    );
    const paragraph = persistedRoot.fragment.children[0];
    const paragraphInstance =
      paragraph?.type === "id" ? instances.get(paragraph.value) : undefined;
    expect(
      paragraphInstance?.children.map((child) =>
        child.type === "id"
          ? instances.get(child.value)?.children[0]?.value
          : child.value
      )
    ).toEqual(["Updated", "Same"]);

    unregister();
    resetMaterializedContent();
  });

  test("abandons queued MDX persistence and identity locks after reset", async () => {
    setBaseStores();
    $builderMode.set("content");
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", blockComponent, [
            { type: "id", value: "templates" },
          ]),
        ],
        ["templates", createInstance("templates", blockTemplateComponent, [])],
      ])
    );
    $props.set(
      new Map([
        [
          "source",
          {
            id: "source",
            instanceId: "block",
            name: contentBlockSourceProp,
            type: "asset" as const,
            value: "article",
          },
        ],
      ])
    );
    const renderScope = JSON.stringify(["block", "body"]);
    const materialize = async (source: string, revision: string) =>
      materializeMdxAuthoredContent({
        identity: {
          blockInstanceId: "block",
          assetId: "article",
          revision,
          contentRef: "article.mdx",
          format: "mdx",
          renderScope,
        },
        document: await parseMdxDocument({ source }),
        templateMaterialization: {
          templates: [],
          diagnostics: [],
          dependencies: { templateNames: [], templates: [] },
        },
      });
    const oldRoot = await materialize("Before", "sha256:old-project");
    publishMaterializedContentRoot(oldRoot);
    const oldChild = oldRoot.fragment.children[0];
    if (oldChild?.type !== "id") {
      throw new Error("Expected old project content");
    }
    selectInstance([oldChild.value, "block", "body"]);
    let finishOldProjectSave!: () => void;
    const oldProjectSave = new Promise<void>((resolve) => {
      finishOldProjectSave = resolve;
    });
    const saveOldProject = vi.fn(async () => {
      await oldProjectSave;
      return { status: "applied" as const };
    });
    registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: saveOldProject,
    });

    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: oldChild.value,
        mode: "text",
        text: "Old first",
      },
    });
    await vi.waitFor(() => expect(saveOldProject).toHaveBeenCalledOnce());
    const queuedOldMutation = executeRuntimeMutationAsync({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: oldChild.value,
        mode: "text",
        text: "Old second",
      },
    });

    resetMaterializedContent();
    await expect(queuedOldMutation).resolves.toBeUndefined();
    const newRoot = await materialize("New project", "sha256:new-project");
    publishMaterializedContentRoot(newRoot);
    const saveNewProject = vi.fn(async () => ({ status: "applied" as const }));
    const unregisterNewProject = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: saveNewProject,
    });
    const newChild = newRoot.fragment.children[0];
    if (newChild?.type !== "id") {
      throw new Error("Expected new project content");
    }
    selectInstance([newChild.value, "block", "body"]);
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: newChild.value,
        mode: "text",
        text: "New project edit",
      },
    });
    await vi.waitFor(() => expect(saveNewProject).toHaveBeenCalledOnce());
    finishOldProjectSave();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveOldProject).toHaveBeenCalledOnce();
    expect(saveNewProject).toHaveBeenCalledOnce();
    expect(
      $materializedContentRoots
        .get()
        .get(JSON.stringify(["block", renderScope]))?.identity.revision
    ).toBe("sha256:new-project");
    unregisterNewProject();

    publishMaterializedContentRoot(newRoot);
    let finishIdentitySave!: () => void;
    const identitySavePending = new Promise<void>((resolve) => {
      finishIdentitySave = resolve;
    });
    const saveIdentityInsertion = vi.fn(async () => {
      await identitySavePending;
      return { status: "applied" as const };
    });
    registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: saveIdentityInsertion,
    });
    const oldGenerationInsertion = executeRuntimeMutationAsync({
      id: "instances.insertMdxText",
      input: { parentInstanceId: "block", source: "Old insertion" },
      context: { materializedContent: [newRoot] },
    });
    await vi.waitFor(() =>
      expect(saveIdentityInsertion).toHaveBeenCalledOnce()
    );
    const thirdRoot = await materialize(
      "Third project",
      "sha256:third-project"
    );

    resetMaterializedContent();
    publishMaterializedContentRoot(thirdRoot);
    const saveThirdProject = vi.fn(async () => ({
      status: "applied" as const,
    }));
    const unregisterThirdProject = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: saveThirdProject,
    });
    executeRuntimeMutation({
      id: "instances.insertFragment",
      input: {
        parentInstanceId: "block",
        fragment: {
          children: [{ type: "id", value: "new-fragment" }],
          instances: [
            {
              type: "instance",
              id: "new-fragment",
              component: "ws:element",
              tag: "p",
              children: [{ type: "text", value: "New insertion" }],
            },
          ],
          props: [],
          assets: [],
          dataSources: [],
          resources: [],
          breakpoints: [],
          styleSourceSelections: [],
          styleSources: [],
          styles: [],
        },
      },
      context: { materializedContent: [thirdRoot] },
    });
    await vi.waitFor(() => expect(saveThirdProject).toHaveBeenCalledOnce());
    await expect(oldGenerationInsertion).resolves.toBeUndefined();
    finishIdentitySave();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saveThirdProject).toHaveBeenCalledOnce();
    unregisterThirdProject();
    resetMaterializedContent();
    $builderMode.set("design");
  });

  test("executes text content runtime mutations against builder stores", () => {
    setBaseStores();

    const result = executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "body",
        mode: "text",
        text: "Hello",
      },
    });

    expect(result?.result).toEqual({
      instanceId: "body",
      operation: "set",
      mode: "text",
    });
    expect($instances.get().get("body")?.children).toEqual([
      { type: "text", value: "Hello" },
    ]);
  });

  test("routes projected text edits to MDX storage without persisting projected instances", async () => {
    setBaseStores();
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", "ws:block", [
            { type: "id", value: "templates" },
          ]),
        ],
        ["templates", createInstance("templates", "ws:block-template", [])],
      ])
    );
    $props.set(
      new Map([
        [
          "source",
          {
            id: "source",
            instanceId: "block",
            name: "src",
            type: "asset" as const,
            value: "article",
          },
        ],
      ])
    );
    const identity = {
      blockInstanceId: "block",
      assetId: "article",
      revision: "sha256:one",
      contentRef: "article.mdx",
      format: "mdx" as const,
      renderScope: JSON.stringify(["block", "body"]),
    };
    const authoredRoot: MaterializedMdxAuthoredContentRoot = {
      identity,
      fragment: {
        children: [{ type: "id", value: "external" }],
        instances: [
          {
            type: "instance",
            id: "external",
            component: "ws:element",
            tag: "p",
            children: [{ type: "text", value: "Before" }],
          },
        ],
        props: [],
        assets: [],
        dataSources: [],
        resources: [],
        breakpoints: [],
        styleSourceSelections: [],
        styleSources: [],
        styles: [],
      },
      document: {
        frontmatter: { properties: {} },
        children: [
          {
            type: "element",
            syntax: "markdown",
            tag: "p",
            props: [],
            children: [{ type: "text", value: "Before" }],
          },
        ],
      },
      provenance: {
        nodes: [
          {
            type: "element",
            path: [0],
            instanceId: "external",
            assetProps: [],
          },
        ],
        unresolvedTemplates: [],
      },
    };
    publishMaterializedContentRoot(authoredRoot);
    let persistedRoot = authoredRoot;
    let persistedRevision = 0;
    const preflight = vi.fn(
      async (changes: readonly ContentStorageChange[]) => {
        if (persistedRevision > 0) {
          expect(
            changes.every(
              ({ root }) =>
                root.identity.revision === `sha256:saved-${persistedRevision}`
            )
          ).toBe(true);
        }
        return { status: "applied" as const };
      }
    );
    let finishSecondSave!: () => void;
    const secondSave = new Promise<void>((resolve) => {
      finishSecondSave = resolve;
    });
    const save = vi.fn(async (changes: readonly ContentStorageChange[]) => {
      persistedRevision += 1;
      if (persistedRevision === 2) {
        await secondSave;
      }
      persistedRoot = {
        ...persistedRoot,
        identity: {
          ...persistedRoot.identity,
          revision: `sha256:saved-${persistedRevision}`,
        },
        fragment: applyMdxContentStorageChanges({
          root: persistedRoot,
          changes,
        }),
      };
      publishMaterializedContentRoot(persistedRoot);
      return { status: "applied" as const };
    });
    const unregister = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: identity.renderScope,
      preflight,
      isCurrent: () => true,
      save,
    });
    selectInstance(["external", "block", "body"]);

    const result = executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "external",
        mode: "text",
        text: "After",
      },
    });
    await vi.waitFor(() =>
      expect($runtimeInstances.get().get("external")?.children).toEqual([
        { type: "text", value: "After" },
      ])
    );
    expect(
      getMaterializedContentStatus({
        blockInstanceId: "block",
        renderScope: identity.renderScope,
      })
    ).toBe("pending");
    const accumulated = executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "external",
        mode: "text",
        text: "Again",
      },
    });
    expect(accumulated).toBeUndefined();
    await vi.waitFor(() =>
      expect($runtimeInstances.get().get("external")?.children).toEqual([
        { type: "text", value: "Again" },
      ])
    );
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect($runtimeInstances.get().get("external")?.children).toEqual([
      { type: "text", value: "Again" },
    ]);
    expect(
      getMaterializedContentStatus({
        blockInstanceId: "block",
        renderScope: identity.renderScope,
      })
    ).toBe("pending");
    finishSecondSave();
    await vi.waitFor(() =>
      expect(
        getMaterializedContentStatus({
          blockInstanceId: "block",
          renderScope: identity.renderScope,
        })
      ).toBe("ready")
    );
    const savedRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", identity.renderScope]));
    if (savedRoot === undefined) {
      throw new Error("Expected saved materialized content");
    }
    publishMaterializedContentRoot(savedRoot);

    expect(result).toBeUndefined();
    expect($instances.get().has("external")).toBe(false);
    expect($instances.get().get("block")?.children).toEqual([
      { type: "id", value: "templates" },
    ]);
    unregister();

    let rejectFirstPreflight!: () => void;
    const firstPreflight = new Promise<void>((resolve) => {
      rejectFirstPreflight = resolve;
    });
    let preflightCount = 0;
    const interleavedPreflight = vi.fn(async () => {
      preflightCount += 1;
      if (preflightCount === 1) {
        await firstPreflight;
        return {
          status: "blocked" as const,
          message: "The source revision changed.",
        };
      }
      return { status: "applied" as const };
    });
    const interleavedSave = vi.fn(async () => ({ status: "applied" as const }));
    const unregisterInterleaved = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: identity.renderScope,
      preflight: interleavedPreflight,
      isCurrent: () => true,
      save: interleavedSave,
    });
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "external",
        mode: "text",
        text: "Conflicting",
      },
    });
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "external",
        mode: "text",
        text: "Must not save",
      },
    });
    await vi.waitFor(() => expect(interleavedPreflight).toHaveBeenCalledOnce());
    rejectFirstPreflight();
    await vi.waitFor(() =>
      expect(
        getMaterializedContentStatus({
          blockInstanceId: "block",
          renderScope: identity.renderScope,
        })
      ).toBe("failed")
    );
    expect(interleavedPreflight).toHaveBeenCalledOnce();
    expect(interleavedSave).not.toHaveBeenCalled();
    unregisterInterleaved();
    const failedRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", identity.renderScope]));
    if (failedRoot === undefined) {
      throw new Error("Expected failed materialized content");
    }
    publishMaterializedContentRoot(failedRoot);

    const unregisterStale = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: identity.renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => false,
      save,
    });
    expect(
      executeRuntimeMutation({
        id: "instances.setTextContent",
        input: {
          operation: "set",
          instanceId: "external",
          mode: "text",
          text: "Stale",
        },
      })
    ).toBeUndefined();
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(2);
    unregisterStale();

    let finishSave: ((result: { status: "applied" }) => void) | undefined;
    const deferredSave = vi.fn(
      () =>
        new Promise<{ status: "applied" }>((resolve) => {
          finishSave = resolve;
        })
    );
    const unregisterDeferred = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: identity.renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: deferredSave,
    });
    let asyncMutationSettled = false;
    const asyncMutation = executeRuntimeMutationAsync({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "external",
        mode: "text",
        text: "Async",
      },
    }).then((mutation) => {
      asyncMutationSettled = true;
      return mutation;
    });
    await vi.waitFor(() => expect(deferredSave).toHaveBeenCalledOnce());
    expect(asyncMutationSettled).toBe(false);
    finishSave?.({ status: "applied" });
    expect((await asyncMutation)?.storageChanges).toHaveLength(1);
    unregisterDeferred();
    const latestRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", identity.renderScope]));
    if (latestRoot === undefined) {
      throw new Error("Expected accumulated materialized content");
    }
    publishMaterializedContentRoot(latestRoot);
    const unregisterRejected = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: identity.renderScope,
      preflight: async () => ({ status: "applied" }),
      isCurrent: () => true,
      save: async () => {
        throw new Error("private transport details");
      },
    });
    await expect(
      executeRuntimeMutationAsync({
        id: "instances.setTextContent",
        input: {
          operation: "set",
          instanceId: "external",
          mode: "text",
          text: "Rejected",
        },
      })
    ).resolves.toBeUndefined();
    expect(
      getMaterializedContentStatus({
        blockInstanceId: "block",
        renderScope: identity.renderScope,
      })
    ).toBe("failed");
    unregisterRejected();
    resetMaterializedContent();
  });

  test("waits for an MDX copy source before persisting the target", async () => {
    setBaseStores();
    $builderMode.set("content");
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [
            { type: "id", value: "source-block" },
            { type: "id", value: "target-block" },
          ]),
        ],
        [
          "source-block",
          createInstance("source-block", blockComponent, [
            { type: "id", value: "source-templates" },
          ]),
        ],
        [
          "source-templates",
          createInstance("source-templates", blockTemplateComponent, []),
        ],
        [
          "target-block",
          createInstance("target-block", blockComponent, [
            { type: "id", value: "target-templates" },
          ]),
        ],
        [
          "target-templates",
          createInstance("target-templates", blockTemplateComponent, []),
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "source-prop",
          {
            id: "source-prop",
            instanceId: "source-block",
            name: "src",
            type: "asset" as const,
            value: "source",
          },
        ],
        [
          "target-prop",
          {
            id: "target-prop",
            instanceId: "target-block",
            name: "src",
            type: "asset" as const,
            value: "target",
          },
        ],
      ])
    );
    const materialize = async ({
      blockInstanceId,
      assetId,
      source,
    }: {
      blockInstanceId: string;
      assetId: string;
      source: string;
    }) =>
      materializeMdxAuthoredContent({
        identity: {
          blockInstanceId,
          assetId,
          revision: `sha256:${assetId}`,
          contentRef: `${assetId}.mdx`,
          format: "mdx",
          renderScope: JSON.stringify([blockInstanceId, "body"]),
        },
        document: await parseMdxDocument({ source }),
        templateMaterialization: {
          templates: [],
          diagnostics: [],
          dependencies: { templateNames: [], templates: [] },
        },
      });
    let sourceRoot = await materialize({
      blockInstanceId: "source-block",
      assetId: "source",
      source: "Source paragraph",
    });
    const targetRoot = await materialize({
      blockInstanceId: "target-block",
      assetId: "target",
      source: "Target paragraph",
    });
    publishMaterializedContentRoot(sourceRoot);
    publishMaterializedContentRoot(targetRoot);
    const sourceChild = sourceRoot.fragment.children[0];
    if (sourceChild?.type !== "id") {
      throw new Error("Expected source instance");
    }
    let finishSourceSave!: () => void;
    const sourceSavePending = new Promise<void>((resolve) => {
      finishSourceSave = resolve;
    });
    const sourceSave = vi.fn(async () => {
      await sourceSavePending;
      const rematerialized = await materialize({
        blockInstanceId: "source-block",
        assetId: "source",
        source: '<ws.element ws:name="Missing" />\n\nUpdated source',
      });
      sourceRoot = {
        ...rematerialized,
        identity: {
          ...rematerialized.identity,
          revision: "sha256:source-saved",
        },
      };
      publishMaterializedContentRoot(sourceRoot);
      return { status: "applied" as const };
    });
    let copiedSourceRoot: MaterializedMdxAuthoredContentRoot | undefined;
    const targetPreflight = vi.fn(
      async (
        changes: readonly ContentStorageChange[],
        loadedRoots: readonly MaterializedMdxAuthoredContentRoot[]
      ) => {
        if (copiedSourceRoot === undefined) {
          throw new Error("Expected the copied source snapshot");
        }
        expect(changes[0].copySource?.root).toEqual({
          type: "external",
          identity: copiedSourceRoot.identity,
        });
        expect(changes[0].copySource?.instanceId).toBe(sourceChild.value);
        expect(loadedRoots).toContain(copiedSourceRoot);
        expect(
          loadedRoots.some(
            ({ identity }) =>
              identity.blockInstanceId === targetRoot.identity.blockInstanceId
          )
        ).toBe(true);
        expect(loadedRoots).toHaveLength(2);
        expect(
          sourceRoot.fragment.instances.some(
            ({ id }) => id === sourceChild.value
          )
        ).toBe(false);
        return { status: "applied" as const };
      }
    );
    const unregisterSource = registerContentStorageSaver({
      blockInstanceId: "source-block",
      renderScope: sourceRoot.identity.renderScope,
      preflight: async () => ({ status: "applied" }),
      save: sourceSave,
      isCurrent: () => true,
    });
    const unregisterTarget = registerContentStorageSaver({
      blockInstanceId: "target-block",
      renderScope: targetRoot.identity.renderScope,
      preflight: targetPreflight,
      save: async () => ({ status: "applied" }),
      isCurrent: () => true,
    });
    selectInstance([sourceChild.value, "source-block", "body"]);
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: sourceChild.value,
        mode: "text",
        text: "Updated source",
      },
    });
    await vi.waitFor(() => expect(sourceSave).toHaveBeenCalledOnce());
    copiedSourceRoot = $materializedContentRoots
      .get()
      .get(
        JSON.stringify(["source-block", sourceRoot.identity.renderScope])
      ) as MaterializedMdxAuthoredContentRoot;
    const copy = executeRuntimeMutationAsync({
      id: "instances.clone",
      input: {
        sourceInstanceId: sourceChild.value,
        targetParentInstanceId: "target-block",
      },
      context: {
        materializedContent: Array.from(
          $materializedContentRoots.get().values()
        ),
      },
    });
    await Promise.resolve();
    expect(targetPreflight).not.toHaveBeenCalled();
    finishSourceSave();
    const copyResult = await copy;
    expect(targetPreflight).toHaveBeenCalledOnce();
    expect(copyResult).toBeDefined();

    unregisterSource();
    const currentSourceChild = sourceRoot.fragment.children.at(-1);
    if (currentSourceChild?.type !== "id") {
      throw new Error("Expected rematerialized source instance");
    }
    let finishFailedSourceSave!: () => void;
    const failedSourceSavePending = new Promise<void>((resolve) => {
      finishFailedSourceSave = resolve;
    });
    const failedSourceSave = vi.fn(async () => {
      await failedSourceSavePending;
      return {
        status: "blocked" as const,
        message: "The source revision changed.",
      };
    });
    const unregisterFailedSource = registerContentStorageSaver({
      blockInstanceId: "source-block",
      renderScope: sourceRoot.identity.renderScope,
      preflight: async () => ({ status: "applied" }),
      save: failedSourceSave,
      isCurrent: () => true,
    });
    selectInstance([currentSourceChild.value, "source-block", "body"]);
    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: currentSourceChild.value,
        mode: "text",
        text: "Must not be copied",
      },
    });
    await vi.waitFor(() => expect(failedSourceSave).toHaveBeenCalledOnce());
    const rejectedCopy = executeRuntimeMutationAsync({
      id: "instances.clone",
      input: {
        sourceInstanceId: currentSourceChild.value,
        targetParentInstanceId: "target-block",
      },
      context: {
        materializedContent: Array.from(
          $materializedContentRoots.get().values()
        ),
      },
    });
    finishFailedSourceSave();
    await expect(rejectedCopy).resolves.toBeUndefined();
    expect(targetPreflight).toHaveBeenCalledOnce();

    unregisterTarget();
    unregisterFailedSource();
    resetMaterializedContent();
    $builderMode.set("design");
  });

  test("does not replan a queued rich-text edit onto a switched Asset", async () => {
    setBaseStores();
    $builderMode.set("content");
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", blockComponent, [
            { type: "id", value: "templates" },
          ]),
        ],
        ["templates", createInstance("templates", blockTemplateComponent, [])],
      ])
    );
    const sourceProp = {
      id: "source",
      instanceId: "block",
      name: contentBlockSourceProp,
      type: "asset" as const,
      value: "article",
    };
    $props.set(new Map([[sourceProp.id, sourceProp]]));
    const root = materializeMdxAuthoredContent({
      identity: {
        blockInstanceId: "block",
        assetId: "article",
        revision: "sha256:article",
        contentRef: "article.mdx",
        format: "mdx",
        renderScope: JSON.stringify(["block", "body"]),
      },
      document: await parseMdxDocument({ source: "Paragraph" }),
      templateMaterialization: {
        templates: [],
        diagnostics: [],
        dependencies: { templateNames: [], templates: [] },
      },
    });
    publishMaterializedContentRoot(root);
    const child = root.fragment.children[0];
    if (child?.type !== "id") {
      throw new Error("Expected a materialized paragraph");
    }
    const paragraph = root.fragment.instances.find(
      ({ id }) => id === child.value
    );
    if (paragraph === undefined) {
      throw new Error("Expected a materialized paragraph instance");
    }
    let finishFirstSave!: () => void;
    const firstSavePending = new Promise<void>((resolve) => {
      finishFirstSave = resolve;
    });
    const firstSave = vi.fn(async () => {
      await firstSavePending;
      return { status: "applied" as const };
    });
    const unregisterFirst = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: root.identity.renderScope,
      preflight: async () => ({ status: "applied" }),
      save: firstSave,
      isCurrent: () => true,
    });
    const firstEdit = executeRuntimeMutationAsync({
      id: "instances.updateTextTree",
      input: {
        rootInstanceId: paragraph.id,
        instances: [
          {
            ...paragraph,
            children: [{ type: "text", value: "First edit" }],
          },
        ],
      },
      context: { materializedContent: [root] },
    });
    await vi.waitFor(() => expect(firstSave).toHaveBeenCalledOnce());
    const optimisticRoot = $materializedContentRoots
      .get()
      .get(JSON.stringify(["block", root.identity.renderScope]));
    const optimisticParagraph = $runtimeInstances.get().get(paragraph.id);
    if (optimisticRoot === undefined || optimisticParagraph === undefined) {
      throw new Error("Expected the optimistic paragraph");
    }
    const secondEdit = executeRuntimeMutationAsync({
      id: "instances.updateTextTree",
      input: {
        rootInstanceId: optimisticParagraph.id,
        instances: [
          {
            ...optimisticParagraph,
            children: [{ type: "text", value: "Second edit" }],
          },
        ],
      },
      context: { materializedContent: [optimisticRoot] },
    });
    await Promise.resolve();
    const switchedRoot = {
      ...optimisticRoot,
      identity: {
        ...optimisticRoot.identity,
        assetId: "other",
        revision: "sha256:other",
        contentRef: "other.mdx",
      },
    };
    $props.set(new Map([[sourceProp.id, { ...sourceProp, value: "other" }]]));
    publishMaterializedContentRoot(switchedRoot);
    const switchedPreflight = vi.fn(async () => ({
      status: "applied" as const,
    }));
    const switchedSave = vi.fn(async () => ({ status: "applied" as const }));
    const unregisterSwitched = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope: switchedRoot.identity.renderScope,
      preflight: switchedPreflight,
      save: switchedSave,
      isCurrent: () => true,
    });

    finishFirstSave();
    await firstEdit;
    await expect(secondEdit).resolves.toBeUndefined();
    expect(switchedPreflight).not.toHaveBeenCalled();
    expect(switchedSave).not.toHaveBeenCalled();

    unregisterSwitched();
    unregisterFirst();
    resetMaterializedContent();
    $builderMode.set("design");
  });

  test("uses text content runtime validation before updating stores", () => {
    setBaseStores();

    expect(() =>
      executeRuntimeMutation({
        id: "instances.setTextContent",
        input: {
          operation: "set",
          instanceId: "body",
          mode: "expression",
          text: "invalid expression {",
        },
      })
    ).toThrow("Unexpected token");

    expect($instances.get().get("body")?.children).toEqual([]);
  });

  test("executes breakpoint runtime mutations against builder stores", () => {
    setBaseStores();

    const createResult = executeRuntimeMutation({
      id: "breakpoints.create",
      input: {
        label: "Tablet",
        minWidth: 768,
      },
    });
    const breakpointId = expectGeneratedId(
      createResult?.result.breakpointId,
      "breakpoint id"
    );

    expect($breakpoints.get().get(breakpointId)).toEqual({
      id: breakpointId,
      label: "Tablet",
      minWidth: 768,
    });

    executeRuntimeMutation({
      id: "breakpoints.update",
      input: {
        breakpointId,
        values: {
          label: "Desktop",
          minWidth: 1024,
        },
      },
    });

    expect($breakpoints.get().get(breakpointId)).toEqual({
      id: breakpointId,
      label: "Desktop",
      minWidth: 1024,
    });
  });

  test("deletes breakpoint styles through runtime mutation", () => {
    setBaseStores();
    $breakpoints.set(
      new Map([["tablet", { id: "tablet", label: "Tablet", minWidth: 768 }]])
    );
    $styles.set(
      new Map([
        [
          "style",
          {
            styleSourceId: "local",
            breakpointId: "tablet",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      ])
    );

    executeRuntimeMutation({
      id: "breakpoints.delete",
      input: {
        breakpointId: "tablet",
      },
    });

    expect($breakpoints.get()).toEqual(new Map());
    expect($styles.get()).toEqual(new Map());
  });

  test("executes redirect runtime mutations against builder stores", () => {
    setBaseStores();

    executeRuntimeMutation({
      id: "redirects.setAll",
      input: {
        redirects: [{ old: "/old", new: "/new", status: "301" }],
      },
    });

    expect($pages.get()?.redirects).toEqual([
      { old: "/old", new: "/new", status: "301" },
    ]);
  });

  test("executes folder runtime mutations against builder stores", () => {
    setBaseStores();

    const createResult = executeRuntimeMutation({
      id: "folders.create",
      input: {
        name: "Docs",
        slug: "docs",
      },
    });
    const folderId = expectGeneratedId(
      createResult?.result.folderId,
      "folder id"
    );

    expect($pages.get()?.folders.get(folderId)).toEqual({
      id: folderId,
      name: "Docs",
      slug: "docs",
      children: [],
    });

    executeRuntimeMutation({
      id: "folders.update",
      input: {
        folderId,
        values: {
          name: "Guides",
          slug: "guides",
        },
      },
    });

    expect($pages.get()?.folders.get(folderId)).toEqual({
      id: folderId,
      name: "Guides",
      slug: "guides",
      children: [],
    });

    executeRuntimeMutation({
      id: "folders.delete",
      input: {
        folderId,
      },
    });

    expect($pages.get()?.folders.has(folderId)).toEqual(false);
  });

  test("executes page create and delete runtime mutations against builder stores", () => {
    setBaseStores();

    const createResult = executeRuntimeMutation({
      id: "pages.create",
      input: {
        name: "Pricing",
        path: "/pricing",
      },
    });
    const pageId = expectGeneratedId(createResult?.result.pageId, "page id");
    const rootInstanceId = expectGeneratedId(
      createResult?.result.rootInstanceId,
      "page root instance id"
    );

    expect($pages.get()?.pages.get(pageId)).toEqual(
      expect.objectContaining({
        id: pageId,
        name: "Pricing",
        path: "/pricing",
        rootInstanceId,
      })
    );
    expect($instances.get().get(rootInstanceId)).toEqual(
      expect.objectContaining({
        id: rootInstanceId,
        component: "ws:element",
        tag: "body",
      })
    );

    executeRuntimeMutation({
      id: "pages.delete",
      input: {
        pageId,
      },
    });

    expect($pages.get()?.pages.has(pageId)).toEqual(false);
    expect($instances.get().has(rootInstanceId)).toEqual(false);
  });

  test("executes data variable runtime mutations against builder stores", () => {
    setBaseStores();
    const page = $pages.get()?.pages.get($pages.get()?.homePageId ?? "");

    const createResult = executeRuntimeMutation({
      id: "variables.create",
      input: {
        scopeInstanceId: "body",
        name: "message",
        value: { type: "string", value: "Hello" },
      },
    });
    const dataSourceId = expectGeneratedId(
      createResult?.result.dataSourceId,
      "data source id"
    );

    expect($dataSources.get().get(dataSourceId)).toEqual({
      type: "variable",
      id: dataSourceId,
      scopeInstanceId: "body",
      name: "message",
      value: { type: "string", value: "Hello" },
    });

    executeRuntimeMutation({
      id: "variables.update",
      input: {
        dataSourceId,
        values: {
          name: "greeting",
        },
      },
    });

    expect($dataSources.get().get(dataSourceId)).toEqual(
      expect.objectContaining({
        name: "greeting",
      })
    );

    if (page !== undefined) {
      page.systemDataSourceId = dataSourceId;
    }
    executeRuntimeMutation({
      id: "variables.delete",
      input: {
        dataSourceId,
      },
    });

    expect($dataSources.get().has(dataSourceId)).toEqual(false);
    expect(
      $pages.get()?.pages.get($pages.get()?.homePageId ?? "")
    ).not.toHaveProperty("systemDataSourceId");
  });

  test("executes css variable runtime mutations against builder stores", () => {
    setBaseStores();
    $styles.set(
      new Map([
        [
          "local:base:--old:",
          {
            styleSourceId: "local",
            breakpointId: "base",
            property: "--old",
            value: { type: "unparsed", value: "red" },
          },
        ],
        [
          "local:base:color:",
          {
            styleSourceId: "local",
            breakpointId: "base",
            property: "color",
            value: { type: "unparsed", value: "var(--old)" },
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "code-prop",
          {
            id: "code-prop",
            instanceId: "body",
            name: "code",
            type: "string",
            value: "<style>.x{color:var(--old)}</style>",
          },
        ],
      ])
    );

    executeRuntimeMutation({
      id: "cssVariables.rename",
      input: {
        oldName: "--old",
        newName: "--new",
      },
    });

    expect($styles.get().has("local:base:--old:")).toEqual(false);
    expect($styles.get().get("local:base:--new:")).toEqual(
      expect.objectContaining({
        property: "--new",
      })
    );
    expect($styles.get().get("local:base:color:")).toEqual(
      expect.objectContaining({
        value: { type: "unparsed", value: "var(--new)" },
      })
    );
    expect($props.get().get("code-prop")).toEqual(
      expect.objectContaining({
        value: "<style>.x{color:var(--new)}</style>",
      })
    );

    executeRuntimeMutation({
      id: "cssVariables.delete",
      input: {
        names: ["--new"],
        force: true,
      },
    });

    expect($styles.get().has("local:base:--new:")).toEqual(false);
  });

  test("executes resource runtime mutations against builder stores", () => {
    setBaseStores();

    const upsertResult = executeRuntimeMutation({
      id: "resources.upsertProp",
      input: {
        instanceId: "body",
        propName: "action",
        resource: {
          name: "Submit lead",
          method: "post",
          url: `"https://example.com/leads"`,
          headers: [{ name: `"content-type"`, value: `"application/json"` }],
          body: `"email=hello@example.com"`,
        },
        dataSourceName: "leadResponse",
      },
    });
    const resourceId = expectGeneratedId(
      upsertResult?.result.resourceId,
      "resource id"
    );
    expect(upsertResult?.result.dataSourceId).toBeUndefined();
    const propId = upsertResult?.result.propIds[0];
    expectGeneratedId(propId, "resource prop id");

    expect($resources.get().get(resourceId)).toEqual(
      expect.objectContaining({
        id: resourceId,
        name: "Submit lead",
        method: "post",
        url: `"https://example.com/leads"`,
      })
    );
    expect($dataSources.get()).toEqual(new Map());
    expect($props.get().get(propId ?? "")).toEqual(
      expect.objectContaining({
        instanceId: "body",
        name: "action",
        type: "resource",
        value: resourceId,
      })
    );

    executeRuntimeMutation({
      id: "resources.update",
      input: {
        resourceId,
        values: {
          name: "Submit customer lead",
          url: `"https://example.com/customers"`,
        },
        dataSourceName: "customerLeadResponse",
      },
    });

    expect($resources.get().get(resourceId)).toEqual(
      expect.objectContaining({
        name: "Submit customer lead",
        url: `"https://example.com/customers"`,
      })
    );
    expect($dataSources.get()).toEqual(new Map());

    executeRuntimeMutation({
      id: "resources.delete",
      input: {
        resourceId,
        force: true,
      },
    });

    expect($resources.get().has(resourceId)).toEqual(false);
    expect($dataSources.get()).toEqual(new Map());
    expect($props.get().has(propId ?? "")).toEqual(false);
  });

  test("executes asset runtime mutations against builder stores", () => {
    setBaseStores();
    const asset = createImageAsset("asset");
    $assets.set(new Map([[asset.id, asset]]));

    executeRuntimeMutation({
      id: "assets.update",
      input: {
        assetId: asset.id,
        values: {
          filename: "hero",
          description: "Hero image",
        },
      },
    });

    expect($assets.get().get(asset.id)).toEqual(
      expect.objectContaining({
        filename: "hero",
        description: "Hero image",
      })
    );

    executeRuntimeMutation({
      id: "assets.delete",
      input: {
        assetIdsOrPrefixes: [asset.id],
        force: true,
      },
    });

    expect($assets.get().has(asset.id)).toEqual(false);
  });

  test("executes project settings runtime mutations against builder stores", () => {
    const { pages } = setBaseStores();
    const legacyMeta = pages.meta;
    const legacyCompiler = pages.compiler;

    executeRuntimeMutation({
      id: "projectSettings.update",
      input: {
        meta: {
          contactEmail: "hello@example.com",
        },
        compiler: {
          atomicStyles: true,
        },
      },
    });

    expect($projectSettings.get()?.meta).toEqual(
      expect.objectContaining({
        contactEmail: "hello@example.com",
      })
    );
    expect($projectSettings.get()?.compiler).toEqual(
      expect.objectContaining({
        atomicStyles: true,
      })
    );
    expect($pages.get()?.meta).toEqual(legacyMeta);
    expect($pages.get()?.compiler).toEqual(legacyCompiler);

    executeRuntimeMutation({
      id: "projectSettings.update",
      input: {
        meta: {
          contactEmail: null,
        },
      },
    });

    expect($projectSettings.get()?.meta).not.toHaveProperty("contactEmail");
    expect($pages.get()?.meta).toEqual(legacyMeta);
  });

  test("runtime bridge skips page templates without build access", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const template: PageTemplate = {
      id: "template",
      name: "Template",
      title: "Template",
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $selectedPageId.set(template.id);
    $builderMode.set("design");
    $authPermit.set("view");
    $instances.set(new Map([["body", createInstance("body", "Body", [])]]));
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "body",
        mode: "text",
        text: "Skipped",
      },
    });

    expect($instances.get().get("body")?.children).toEqual([]);
  });

  test("runtime bridge repairs cycles during loaded data migration", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "parent" }]),
      ],
      [
        "parent",
        createInstance("parent", "Box", [{ type: "id", value: "child" }]),
      ],
      ["child", createInstance("child", "Box", [])],
    ]);
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $builderMode.set("design");
    $authPermit.set("build");
    $instances.set(instances);
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());
    $instances.get().get("child")?.children.push({
      type: "id",
      value: "parent",
    });

    migrateLoadedWebstudioData();

    expect(findCycles($instances.get().values())).toEqual([]);
  });
});
