import { describe, expect, test } from "vitest";
import { setEnv } from "@webstudio-is/feature-flags";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import {
  encodeDataVariableId,
  isRootFolder,
  type Folder,
  ROOT_FOLDER_ID,
  ROOT_INSTANCE_ID,
  type DataSource,
  type Instance,
  type Page,
  SYSTEM_VARIABLE_ID,
  type Resource,
  type Pages,
  type WebstudioData,
} from "@webstudio-is/sdk";
import {
  deleteFolderWithChildrenMutable,
  $pageRootScope,
  canDrop,
  deletePageMutable,
  deleteTemplateMutable,
  duplicateFolder,
  duplicateTemplate,
  getStoredDropTarget,
  instantiateTemplate,
  isFolder,
} from "./page-utils";
import { $dataSourceVariables } from "~/shared/nano-states";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { updateCurrentSystem } from "~/shared/system";
import { $resourcesCache, getResourceKey } from "~/shared/resources";
import { expectSlotTreeIntegrity } from "~/shared/slot-test-utils";

setEnv("*");
registerContainers();

const initialSystem = {
  origin: "https://undefined.wstd.work",
  params: {},
  pathname: "/",
  search: {},
};

const createPages = () => {
  const data = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    homePageId: "homePageId",
  });

  const { pages, folders } = data;

  function f(id: string, children?: Array<Page | Folder>): Folder;
  function f(id: string, slug: string, children?: Array<Page | Folder>): Folder;
  // eslint-disable-next-line func-style
  function f(id: string, slug?: unknown, children?: unknown) {
    if (Array.isArray(slug)) {
      children = slug;
      slug = id;
    }
    const folder = {
      id,
      name: id,
      slug: slug ?? id,
      children: register((children as Array<Page | Folder>) ?? [], false),
    };

    return folder;
  }

  const p = (id: string, path: string): Page => {
    const page = {
      id,
      meta: {},
      name: id,
      path,
      rootInstanceId: "rootInstanceId",
      title: `"${id}"`,
    };
    return page;
  };

  const register = (children: Array<Page | Folder>, root: boolean = true) => {
    const childIds = [];
    const rootFolder = Array.from(folders.values()).find(isRootFolder);

    for (const child of children) {
      childIds.push(child.id);
      if ("meta" in child) {
        pages.set(child.id, child);
        continue;
      }
      folders.set(child.id, child);

      if (root) {
        rootFolder?.children.push(child.id);
      }
    }

    return childIds;
  };

  return { f, p, register, pages: data };
};

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

const createWebstudioData = ({
  pages,
  instances = new Map(),
}: {
  pages: Pages;
  instances?: Map<Instance["id"], Instance>;
}) =>
  ({
    pages,
    instances,
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    breakpoints: new Map(),
    styles: new Map(),
    props: new Map(),
    dataSources: new Map(),
    resources: new Map(),
    assets: new Map(),
  }) as unknown as WebstudioData;

describe("deleteFolderWithChildrenMutable", () => {
  const pages = (): Pages => ({
    homePageId: "homePageId",
    rootFolderId: ROOT_FOLDER_ID,
    pages: new Map(),
    folders: toMap<Folder>([
      {
        id: ROOT_FOLDER_ID,
        name: "Root",
        slug: "",
        children: ["2"],
      },
      {
        id: "2",
        name: "2",
        slug: "2",
        children: ["3", "page1"],
      },
      {
        id: "3",
        name: "3",
        slug: "3",
        children: [],
      },
    ]),
  });

  test("delete empty folder", () => {
    const result = deleteFolderWithChildrenMutable("3", pages());
    expect(result).toEqual({ folderIds: ["3"], pageIds: [] });
  });

  test("delete folder with folders and pages", () => {
    const result = deleteFolderWithChildrenMutable("2", pages());
    expect(result).toEqual({
      folderIds: ["2", "3"],
      pageIds: ["page1"],
    });
  });

  test("does not delete folder containing home page", () => {
    const pagesData = pages();
    pagesData.homePageId = "homePageId";
    pagesData.pages.set("homePageId", {
      id: "homePageId",
      meta: {},
      name: "Home",
      path: "",
      rootInstanceId: "rootInstanceId",
      title: `"Home"`,
    });
    pagesData.folders.get("2")?.children.push("homePageId");

    const result = deleteFolderWithChildrenMutable("2", pagesData);

    expect(result).toEqual({ folderIds: [], pageIds: [] });
    expect(pagesData.folders.get("2")).toBeDefined();
  });

  test("does not delete root folder", () => {
    const pagesData = pages();
    const result = deleteFolderWithChildrenMutable(ROOT_FOLDER_ID, pagesData);
    expect(result).toEqual({ folderIds: [], pageIds: [] });
    expect(pagesData.folders.get(ROOT_FOLDER_ID)).toBeDefined();
    expect(pagesData.folders.get(ROOT_FOLDER_ID)?.children).toEqual(["2"]);
  });

  test("does not delete custom root folder", () => {
    const pagesData = pages();
    pagesData.rootFolderId = "2";
    const result = deleteFolderWithChildrenMutable("2", pagesData);
    expect(result).toEqual({ folderIds: [], pageIds: [] });
    expect(pagesData.folders.get("2")).toBeDefined();
  });
});

test("page root scope should rely on selected page", () => {
  const pages = createDefaultPages({
    rootInstanceId: "homeRootId",
    homePageId: "homePageId",
  });
  pages.pages.set("pageId", {
    id: "pageId",
    rootInstanceId: "pageRootId",
    name: "My Name",
    path: "/",
    title: `"My Title"`,
    meta: {},
  });
  $pages.set(pages);
  $selectedPageId.set("pageId");
  $dataSources.set(
    toMap([
      {
        id: "1",
        scopeInstanceId: "homeRootId",
        name: "home variable",
        type: "variable",
        value: { type: "string", value: "" },
      },
      {
        id: "2",
        scopeInstanceId: "pageRootId",
        name: "page variable",
        type: "variable",
        value: { type: "string", value: "" },
      },
    ])
  );
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([
      ["$ws$system", "system"],
      ["$ws$dataSource$2", "page variable"],
    ]),
    scope: {
      $ws$system: initialSystem,
      $ws$dataSource$2: "",
    },
    variableValues: new Map<string, unknown>([
      [SYSTEM_VARIABLE_ID, initialSystem],
      ["2", ""],
    ]),
  });
});

test("page root scope should use variable and resource values", () => {
  $pages.set(
    createDefaultPages({
      rootInstanceId: "homeRootId",
      homePageId: "homePageId",
    })
  );
  $selectedPageId.set("homePageId");
  $dataSources.set(
    toMap([
      {
        id: "valueVariableId",
        scopeInstanceId: "homeRootId",
        name: "value variable",
        type: "variable",
        value: { type: "string", value: "" },
      },
      {
        id: "resourceVariableId",
        scopeInstanceId: "homeRootId",
        name: "resource variable",
        type: "resource",
        resourceId: "resourceId",
      },
    ])
  );
  $dataSourceVariables.set(
    new Map([["valueVariableId", "value variable value"]])
  );
  const resourceKey = getResourceKey({
    name: "my-resource",
    url: "",
    searchParams: [],
    method: "get",
    headers: [],
  });
  $resources.set(
    toMap<Resource>([
      {
        id: "resourceId",
        name: "my-resource",
        url: `""`,
        method: "get",
        headers: [],
      },
    ])
  );
  $resourcesCache.set(new Map([[resourceKey, "resource variable value"]]));
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([
      ["$ws$system", "system"],
      ["$ws$dataSource$valueVariableId", "value variable"],
      ["$ws$dataSource$resourceVariableId", "resource variable"],
    ]),
    scope: {
      $ws$system: initialSystem,
      $ws$dataSource$resourceVariableId: "resource variable value",
      $ws$dataSource$valueVariableId: "value variable value",
    },
    variableValues: new Map<string, unknown>([
      [SYSTEM_VARIABLE_ID, initialSystem],
      ["valueVariableId", "value variable value"],
      ["resourceVariableId", "resource variable value"],
    ]),
  });
});

test("page root scope should provide page system variable value", () => {
  $pages.set(
    createDefaultPages({
      rootInstanceId: "homeRootId",
      homePageId: "homePageId",
      systemDataSourceId: "systemId",
    })
  );
  $selectedPageId.set("homePageId");
  $dataSources.set(
    toMap([
      {
        id: "systemId",
        scopeInstanceId: "homeRootId",
        name: "system",
        type: "parameter",
      },
    ])
  );
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([["$ws$dataSource$systemId", "system"]]),
    scope: {
      $ws$dataSource$systemId: {
        origin: "https://undefined.wstd.work",
        params: {},
        pathname: "/",
        search: {},
      },
    },
    variableValues: new Map([
      [
        "systemId",
        {
          params: {},
          pathname: "/",
          search: {},
          origin: "https://undefined.wstd.work",
        },
      ],
    ]),
  });
  updateCurrentSystem({
    params: { slug: "my-post" },
  });
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([["$ws$dataSource$systemId", "system"]]),
    scope: {
      $ws$dataSource$systemId: {
        params: { slug: "my-post" },
        pathname: "/",
        search: {},
        origin: "https://undefined.wstd.work",
      },
    },
    variableValues: new Map([
      [
        "systemId",
        {
          params: { slug: "my-post" },
          pathname: "/",
          search: {},
          origin: "https://undefined.wstd.work",
        },
      ],
    ]),
  });
});

describe("deletePageMutable", () => {
  test("does not delete home page", async () => {
    const { pages: pagesData } = createPages();
    const homePage = pagesData.pages.get(pagesData.homePageId);
    const data = {
      pages: pagesData,
      instances: new Map(),
    } as unknown as WebstudioData;

    deletePageMutable(pagesData.homePageId, data);

    expect(pagesData.pages.get(pagesData.homePageId)).toEqual(homePage);
    expect(
      Array.from(pagesData.folders.values()).some((folder) =>
        folder.children.includes(pagesData.homePageId)
      )
    ).toBe(true);
  });

  test("should delete a page from pages array", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1"), p("page2", "/page2")]);

    // Create minimal WebstudioData
    const data = {
      pages: pagesData,
      instances: new Map(),
    } as unknown as WebstudioData;

    deletePageMutable("page1", data);

    expect(pagesData.pages.get("page1")).toBeUndefined();
    expect(pagesData.pages.get("page2")).toBeDefined();
  });

  test("should delete page instance", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);

    const page = pagesData.pages.get("page1");
    const rootInstanceId = page?.rootInstanceId;

    // Create minimal WebstudioData with all required properties
    const data = {
      pages: pagesData,
      instances: new Map([
        [
          rootInstanceId!,
          {
            id: rootInstanceId,
            type: "instance",
            component: "Body",
            children: [],
          },
        ],
      ]),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      breakpoints: new Map(),
      styles: new Map(),
      props: new Map(),
      dataSources: new Map(),
      resources: new Map(),
    } as unknown as WebstudioData;

    deletePageMutable("page1", data);

    expect(data.instances.has(rootInstanceId!)).toBe(false);
  });

  test("deletes page slot occurrence without deleting shared slot content used by another page", async () => {
    const { pages: pagesData, register, p } = createPages();
    const page1 = p("page1", "/page1");
    const page2 = {
      ...p("page2", "/page2"),
      rootInstanceId: "page2RootId",
    };
    register([page1, page2]);

    const data = createWebstudioData({
      pages: pagesData,
      instances: new Map([
        [
          "rootInstanceId",
          {
            id: "rootInstanceId",
            type: "instance",
            component: "Body",
            children: [{ type: "id", value: "slot1" }],
          },
        ],
        [
          "page2RootId",
          {
            id: "page2RootId",
            type: "instance",
            component: "Body",
            children: [{ type: "id", value: "slot2" }],
          },
        ],
        [
          "slot1",
          {
            id: "slot1",
            type: "instance",
            component: "Slot",
            children: [{ type: "id", value: "fragment" }],
          },
        ],
        [
          "slot2",
          {
            id: "slot2",
            type: "instance",
            component: "Slot",
            children: [{ type: "id", value: "fragment" }],
          },
        ],
        [
          "fragment",
          {
            id: "fragment",
            type: "instance",
            component: "Fragment",
            children: [{ type: "id", value: "sharedBox" }],
          },
        ],
        [
          "sharedBox",
          {
            id: "sharedBox",
            type: "instance",
            component: "Box",
            children: [],
          },
        ],
      ]),
    });

    deletePageMutable("page1", data);

    expect(data.instances.has("rootInstanceId")).toBe(false);
    expect(data.instances.has("slot1")).toBe(false);
    expect(data.instances.get("page2RootId")?.children).toEqual([
      { type: "id", value: "slot2" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "sharedBox" },
    ]);
    expect(data.instances.get("sharedBox")).toMatchObject({
      component: "Box",
    });
    expectSlotTreeIntegrity(data.instances);
  });

  test("should remove page from folder children", async () => {
    const { pages: pagesData, register, p, f } = createPages();
    register([f("folder1", [p("page1", "/page1")])]);

    const folder = pagesData.folders.get("folder1");
    expect(folder?.children).toContain("page1");

    // Create minimal WebstudioData
    const data = {
      pages: pagesData,
      instances: new Map(),
    } as unknown as WebstudioData;

    deletePageMutable("page1", data);

    expect(folder?.children).not.toContain("page1");
  });
});

describe("isFolder", () => {
  test("should return true for existing folder id", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);
    expect(isFolder("folder1", pagesData.folders)).toBe(true);
  });

  test("should return false for non-existing folder id", async () => {
    const { pages: pagesData } = createPages();
    expect(isFolder("nonexistent", pagesData.folders)).toBe(false);
  });

  test("should return false for page id", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);
    expect(isFolder("page1", pagesData.folders)).toBe(false);
  });
});

describe("getStoredDropTarget", () => {
  test("should return drop target with parent id", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([f("folder1", [p("page1", "/page1")])]);
    $pages.set(pagesData);
    // selector order is [item, parent, grandparent, ...]
    const selector = ["page1", "folder1", ROOT_FOLDER_ID];
    const dropTarget = { parentLevel: 1, beforeLevel: 1 };

    const result = getStoredDropTarget(selector, dropTarget);

    expect(result).toEqual({
      parentId: "folder1",
      beforeId: "folder1",
      afterId: undefined,
      indexWithinChildren: 0,
    });
  });

  test("should calculate indexWithinChildren based on beforeId", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([f("folder1", [p("page1", "/page1"), p("page2", "/page2")])]);
    $pages.set(pagesData);
    const selector = ["page2", "folder1", ROOT_FOLDER_ID];
    const dropTarget = { parentLevel: 1, beforeLevel: 0 };

    const result = getStoredDropTarget(selector, dropTarget);

    // beforeLevel: 0 means selector.at(-0-1) = selector.at(-1) = ROOT_FOLDER_ID
    // But ROOT_FOLDER_ID is not in folder1's children, so indexWithinChildren = 0
    expect(result?.indexWithinChildren).toBe(0);
  });

  test("should calculate indexWithinChildren based on afterId", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([f("folder1", [p("page1", "/page1"), p("page2", "/page2")])]);
    $pages.set(pagesData);
    const selector = ["page1", "folder1", ROOT_FOLDER_ID];
    const dropTarget = { parentLevel: 1, afterLevel: 0 };

    const result = getStoredDropTarget(selector, dropTarget);

    // afterLevel: 0 means selector.at(-0-1) = selector.at(-1) = ROOT_FOLDER_ID
    // But ROOT_FOLDER_ID is not in folder1's children, so indexWithinChildren = 0
    expect(result?.indexWithinChildren).toBe(0);
  });

  test("should return undefined when parent id is undefined", async () => {
    const { pages: pagesData } = createPages();
    $pages.set(pagesData);
    const selector = ["page1"];
    const dropTarget = { parentLevel: 5 };

    const result = getStoredDropTarget(selector, dropTarget);

    expect(result).toBeUndefined();
  });
});

describe("canDrop", () => {
  test("should allow dropping inside a folder", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);
    const dropTarget = {
      parentId: "folder1",
      indexWithinChildren: 1,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(true);
  });

  test("should forbid dropping on non-folder", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);
    const dropTarget = {
      parentId: "page1",
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(false);
  });

  test("should forbid dropping at index 0 of root folder", async () => {
    const { pages: pagesData } = createPages();
    const dropTarget = {
      parentId: ROOT_FOLDER_ID,
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(false);
  });

  test("should allow dropping at index > 0 of root folder", async () => {
    const { pages: pagesData } = createPages();
    const dropTarget = {
      parentId: ROOT_FOLDER_ID,
      indexWithinChildren: 1,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(true);
  });

  test("uses rootFolderId when forbidding drops before home page", async () => {
    const { pages: pagesData } = createPages();
    pagesData.rootFolderId = "customRoot";
    pagesData.folders.set("customRoot", {
      id: "customRoot",
      name: "Root",
      slug: "",
      children: [],
    });
    const dropTarget = {
      parentId: "customRoot",
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(false);
  });
});

describe("duplicateFolder", () => {
  $project.set({ id: "projectId" } as Project);

  test("should duplicate a folder with deduplicated name", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    expect(newFolder?.name).toBe("folder1 (1)");
    expect(newFolder?.slug).toBe("folder1-1");
  });

  test("should duplicate a folder with pages", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([f("folder1", [p("page1", "/page1"), p("page2", "/page2")])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    // Note: Page duplication is handled by runtime insertPageCopyMutable
    // which requires full WebstudioData setup. Here we just verify the folder structure.
    expect(newFolder?.children.length).toBeGreaterThan(0);
  });

  test("should duplicate a folder with nested folders", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([
      f("folder1", [
        f("subfolder1", [p("page1", "/page1")]),
        p("page2", "/page2"),
      ]),
    ]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    expect(newFolder?.children.length).toBeGreaterThan(0);

    // Check that subfolder was duplicated
    const subFolderChild = newFolder?.children.find((childId) =>
      updatedPages.folders.has(childId)
    );
    expect(subFolderChild).toBeDefined();
    const subFolder =
      subFolderChild === undefined
        ? undefined
        : updatedPages.folders.get(subFolderChild);
    expect(subFolder).toBeDefined();
    expect(subFolder?.name).toBe("subfolder1 (1)");
  });

  test("should deduplicate folder names correctly with existing copies", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", "folder1", []), f("folder1 (1)", "folder1-1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder?.name).toBe("folder1 (2)");
    expect(newFolder?.slug).toBe("folder1-2");
  });

  test("should preserve empty folder slugs when duplicating", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", "", []), f("folder2", "", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder?.name).toBe("folder1 (1)");
    expect(newFolder?.slug).toBe("");
  });

  test("should register duplicated folder in parent folder", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);
    const newFolderId = duplicateFolder("folder1");

    const updatedPages = $pages.get()!;
    const rootFolder = Array.from(updatedPages.folders.values()).find(
      isRootFolder
    );
    expect(rootFolder?.children).toContain(newFolderId);
  });
});

describe("duplicateTemplate", () => {
  $project.set({ id: "projectId" } as Project);

  test("remaps copied data source ids in title and metadata", async () => {
    const { pages: pagesData } = createPages();
    const variableId = "templateVariableId";
    const variableIdentifier = encodeDataVariableId(variableId);

    pagesData.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Title: " + ${variableIdentifier}`,
          rootInstanceId: "templateRootId",
          meta: {
            description: `"Description: " + ${variableIdentifier}`,
            custom: [
              {
                property: "Property",
                content: `"Value: " + ${variableIdentifier}`,
              },
            ],
          },
        },
      ],
    ]);

    const dataSource: DataSource = {
      type: "variable",
      id: variableId,
      name: "templateVariable",
      scopeInstanceId: "templateRootId",
      value: { type: "string", value: "" },
    };

    $pages.set(pagesData);
    $instances.set(
      new Map([
        [
          ROOT_INSTANCE_ID,
          {
            type: "instance",
            id: ROOT_INSTANCE_ID,
            component: "Body",
            children: [{ type: "id", value: "rootBoxId" }],
          },
        ],
        [
          "rootBoxId",
          {
            type: "instance",
            id: "rootBoxId",
            component: "Box",
            children: [],
          },
        ],
        [
          "templateRootId",
          {
            type: "instance",
            id: "templateRootId",
            component: "Body",
            children: [],
          },
        ],
      ])
    );
    $props.set(new Map());
    $dataSources.set(new Map([[dataSource.id, dataSource]]));
    $resources.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $assets.set(new Map());
    const newTemplateId = duplicateTemplate("templateId");

    expect(newTemplateId).toBeDefined();
    expect($instances.get().size).toEqual(4);
    const newTemplate = $pages.get()?.pageTemplates?.get(newTemplateId ?? "");
    const newVariable = Array.from($dataSources.get().values()).find(
      (item) => item.name === "templateVariable" && item.id !== variableId
    );
    expect(newVariable).toBeDefined();
    const newVariableIdentifier = encodeDataVariableId(newVariable?.id ?? "");
    expect(newTemplate).toEqual({
      id: newTemplateId,
      name: "Template (1)",
      title: `"Title: " + ${newVariableIdentifier}`,
      rootInstanceId: expect.not.stringMatching("templateRootId"),
      meta: {
        description: `"Description: " + ${newVariableIdentifier}`,
        custom: [
          {
            property: "Property",
            content: `"Value: " + ${newVariableIdentifier}`,
          },
        ],
      },
    });
  });
});

describe("deleteTemplateMutable", () => {
  test("deletes template slot occurrence without deleting shared slot content used by a page", () => {
    const { pages: pagesData } = createPages();
    pagesData.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template"`,
          rootInstanceId: "templateRootId",
          meta: {},
        },
      ],
    ]);

    const data = createWebstudioData({
      pages: pagesData,
      instances: new Map([
        [
          "rootInstanceId",
          {
            id: "rootInstanceId",
            type: "instance",
            component: "Body",
            children: [{ type: "id", value: "slot1" }],
          },
        ],
        [
          "templateRootId",
          {
            id: "templateRootId",
            type: "instance",
            component: "Body",
            children: [{ type: "id", value: "slot2" }],
          },
        ],
        [
          "slot1",
          {
            id: "slot1",
            type: "instance",
            component: "Slot",
            children: [{ type: "id", value: "fragment" }],
          },
        ],
        [
          "slot2",
          {
            id: "slot2",
            type: "instance",
            component: "Slot",
            children: [{ type: "id", value: "fragment" }],
          },
        ],
        [
          "fragment",
          {
            id: "fragment",
            type: "instance",
            component: "Fragment",
            children: [{ type: "id", value: "sharedBox" }],
          },
        ],
        [
          "sharedBox",
          {
            id: "sharedBox",
            type: "instance",
            component: "Box",
            children: [],
          },
        ],
      ]),
    });

    deleteTemplateMutable("templateId", data);

    expect(pagesData.pageTemplates?.has("templateId")).toBe(false);
    expect(data.instances.has("templateRootId")).toBe(false);
    expect(data.instances.has("slot2")).toBe(false);
    expect(data.instances.get("rootInstanceId")?.children).toEqual([
      { type: "id", value: "slot1" },
    ]);
    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "sharedBox" },
    ]);
    expect(data.instances.get("sharedBox")).toMatchObject({
      component: "Box",
    });
    expectSlotTreeIntegrity(data.instances);
  });
});

describe("instantiateTemplate", () => {
  $project.set({ id: "projectId" } as Project);

  test("uses content-safe copy when creating page from template in content mode", () => {
    const { pages: pagesData } = createPages();
    pagesData.pageTemplates = new Map([
      [
        "templateId",
        {
          id: "templateId",
          name: "Template",
          title: `"Template title"`,
          rootInstanceId: "templateRootId",
          meta: {
            description: `"Description"`,
            excludePageFromSearch: "false",
            language: `"en-US"`,
            socialImageAssetId: "assetId",
            socialImageUrl: `"https://example.com/image.png"`,
            custom: [{ property: "og:type", content: `"website"` }],
            auth: { method: "basic", login: "user", password: "password" },
            content: `"text"`,
            documentType: "text",
            redirect: `"/redirect"`,
            status: "404",
          },
        },
      ],
    ]);

    $pages.set(pagesData);
    $instances.set(
      new Map([
        [
          "rootInstanceId",
          {
            type: "instance",
            id: "rootInstanceId",
            component: "Body",
            children: [],
          },
        ],
        [
          "templateRootId",
          {
            type: "instance",
            id: "templateRootId",
            component: "Body",
            children: [],
          },
        ],
      ])
    );
    $props.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $assets.set(new Map());

    const pageId = instantiateTemplate({
      templateId: "templateId",
      overrides: { name: "New page", path: "/new-page" },
      folderId: pagesData.rootFolderId,
      contentMode: true,
    });

    const page = $pages.get()?.pages.get(pageId ?? "");
    expect(page).toEqual({
      id: pageId,
      name: "New page",
      path: "/new-page",
      title: `"Template title"`,
      rootInstanceId: expect.not.stringMatching("templateRootId"),
      meta: {
        description: `"Description"`,
        excludePageFromSearch: "false",
        language: `"en-US"`,
        socialImageAssetId: "assetId",
        socialImageUrl: `"https://example.com/image.png"`,
        custom: [{ property: "og:type", content: `"website"` }],
      },
    });
  });
});
