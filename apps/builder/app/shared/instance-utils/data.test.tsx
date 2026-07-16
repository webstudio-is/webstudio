import { describe, expect, expectTypeOf, test } from "vitest";
import type { Asset, Instance, PageTemplate } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { findCycles } from "@webstudio-is/project-build/runtime";
import type { BuilderRuntimeOperationInput } from "@webstudio-is/project-build/runtime";
import {
  executeRuntimeMutation,
  executeRuntimeMutationAsync,
  executeRuntimeMutationSequence,
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
    const dataSourceId = expectGeneratedId(
      upsertResult?.result.dataSourceId,
      "resource data source id"
    );
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
    expect($dataSources.get().get(dataSourceId)).toEqual(
      expect.objectContaining({
        id: dataSourceId,
        type: "resource",
        resourceId,
        name: "leadResponse",
        scopeInstanceId: "body",
      })
    );
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
    expect($dataSources.get().get(dataSourceId)).toEqual(
      expect.objectContaining({
        name: "customerLeadResponse",
      })
    );

    executeRuntimeMutation({
      id: "resources.delete",
      input: {
        resourceId,
        force: true,
      },
    });

    expect($resources.get().has(resourceId)).toEqual(false);
    expect($dataSources.get().has(dataSourceId)).toEqual(false);
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
