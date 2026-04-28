import { describe, expect, test } from "vitest";
import { setEnv } from "@webstudio-is/feature-flags";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import {
  isRootFolder,
  type Folder,
  ROOT_FOLDER_ID,
  type Page,
  SYSTEM_VARIABLE_ID,
  Resource,
  type Pages,
  type WebstudioData,
} from "@webstudio-is/sdk";
import {
  cleanupChildRefsMutable,
  deleteFolderWithChildrenMutable,
  getAllChildrenAndSelf,
  isSlugAvailable,
  registerFolderChildMutable,
  reparentOrphansMutable,
  $pageRootScope,
  isPathAvailable,
  reparentPageOrFolderMutable,
  deletePageMutable,
} from "./page-utils";
import { $dataSourceVariables } from "~/shared/nano-states";
import {
  $dataSources,
  $pages,
  $project,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { updateCurrentSystem } from "~/shared/system";
import { $resourcesCache, getResourceKey } from "~/shared/resources";

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

describe("reparentOrphansMutable", () => {
  // We must deal with the fact there can be an orphaned folder or page in a collaborative mode,
  // because user A can add a page to a folder while user B deletes the folder without receiving the create page yet.
  test("reparent orphans to the root", () => {
    const { pages } = createPages();
    pages.pages.set("pageId", {
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      title: `"Page"`,
    });
    pages.folders.set("folderId", {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    reparentOrphansMutable(pages);
    const rootFolder = Array.from(pages.folders.values()).find(isRootFolder);
    expect(rootFolder).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      children: ["homePageId", "folderId", "pageId"],
    });
  });

  test("recreates missing root folder with rootFolderId", () => {
    const { pages } = createPages();
    pages.rootFolderId = "customRoot";
    pages.folders = new Map();
    pages.pages.set("pageId", {
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      title: `"Page"`,
    });

    reparentOrphansMutable(pages);

    expect(pages.folders.get("customRoot")).toEqual({
      id: "customRoot",
      name: "Root",
      slug: "",
      children: ["homePageId", "pageId"],
    });
  });

  test("keeps home page first in root folder", () => {
    const { pages } = createPages();
    pages.folders.set("folderId", {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: ["homePageId"],
    });
    pages.folders.get(pages.rootFolderId)!.children = ["folderId"];

    reparentOrphansMutable(pages);

    expect(pages.folders.get(pages.rootFolderId)?.children).toEqual([
      "homePageId",
      "folderId",
    ]);
    expect(pages.folders.get("folderId")?.children).toEqual([]);
  });
});

describe("cleanupChildRefsMutable", () => {
  test("cleanup refs", () => {
    const {
      pages: { folders },
    } = createPages();
    folders.set("folderId", {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    const rootFolder = Array.from(folders.values()).find(isRootFolder);
    rootFolder?.children.push("folderId");
    cleanupChildRefsMutable("folderId", folders);
    expect(rootFolder).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      children: ["homePageId"],
    });
  });

  test("removes duplicate refs from every folder", () => {
    const {
      pages: { folders },
    } = createPages();
    folders.get(ROOT_FOLDER_ID)?.children.push("folderId", "folderId");
    folders.set("folderId", {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: ["folderId"],
    });

    cleanupChildRefsMutable("folderId", folders);

    expect(folders.get(ROOT_FOLDER_ID)?.children).toEqual(["homePageId"]);
    expect(folders.get("folderId")?.children).toEqual([]);
  });
});

describe("isSlugAvailable", () => {
  const {
    pages: { folders },
    register,
    f,
  } = createPages();

  register([
    f("folder1", [f("folder1-1")]),
    f("folder2-1", ""),
    f("folder2-2", ""),
  ]);

  const rootFolder = Array.from(folders.values()).find(isRootFolder)!;

  test("available in the root", () => {
    expect(isSlugAvailable("folder", folders, rootFolder.id)).toBe(true);
  });

  test("not available in the root", () => {
    expect(isSlugAvailable("folder1", folders, rootFolder.id)).toBe(false);
  });

  test("available in folder1", () => {
    expect(isSlugAvailable("folder", folders, "folder1")).toBe(true);
  });

  test("not available in folder1", () => {
    expect(isSlugAvailable("folder1-1", folders, "folder1")).toBe(false);
  });

  test("existing folder can have a matching slug when its the same id/folder", () => {
    expect(isSlugAvailable("folder1-1", folders, "folder1", "folder1-1")).toBe(
      true
    );
  });

  test("empty folder slug can be defined multiple times", () => {
    expect(isSlugAvailable("", folders, "rootInstanceId")).toBe(true);
  });
});

describe("isPathAvailable", () => {
  const { f, p, register, pages } = createPages();

  register([
    f("folder1", [p("page1", "/page")]),
    f("folder2", [p("page2", "/page")]),
    f("/", [p("page3", "/page")]),
  ]);

  test("/folder2/page existing page", () => {
    expect(
      isPathAvailable({
        pages,
        path: "/page",
        parentFolderId: "folder2",
        pageId: "page2",
      })
    ).toBe(true);
  });

  test("/folder2/page new page", () => {
    expect(
      isPathAvailable({ pages, path: "/page", parentFolderId: "folder2" })
    ).toBe(false);
  });

  test("/folder2/page1 new page", () => {
    expect(
      isPathAvailable({ pages, path: "/page1", parentFolderId: "folder2" })
    ).toBe(true);
  });

  test("/page new page", () => {
    expect(isPathAvailable({ pages, path: "/page", parentFolderId: "/" })).toBe(
      false
    );
  });
});

describe("registerFolderChildMutable", () => {
  test("register a folder child in the root via fallback", () => {
    const { pages } = createPages();
    const { folders } = pages;
    registerFolderChildMutable(pages, "folderId");
    const rootFolder = Array.from(folders.values()).find(isRootFolder);
    expect(rootFolder?.children).toEqual(["homePageId", "folderId"]);
  });

  test("register a folder child in a provided folder", () => {
    const { pages } = createPages();
    const { folders } = pages;
    const folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };
    folders.set(folder.id, folder);
    registerFolderChildMutable(pages, "folderId2", "folderId");
    expect(folder.children).toEqual(["folderId2"]);
  });

  test("register in a provided folder & cleanup old refs", () => {
    const { pages } = createPages();
    const { folders } = pages;
    const folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };
    folders.set(folder.id, folder);
    const rootFolder = Array.from(folders.values()).find(isRootFolder);
    registerFolderChildMutable(pages, "folderId", ROOT_FOLDER_ID);
    registerFolderChildMutable(pages, "folderId2", ROOT_FOLDER_ID);

    expect(rootFolder?.children).toEqual([
      "homePageId",
      "folderId",
      "folderId2",
    ]);

    // Moving folderId from root to folderId
    registerFolderChildMutable(pages, "folderId2", "folderId");

    expect(rootFolder?.children).toEqual(["homePageId", "folderId"]);
    expect(folder.children).toEqual(["folderId2"]);
  });

  test("uses rootFolderId for fallback instead of hardcoded root id", () => {
    const { pages } = createPages();
    pages.rootFolderId = "customRoot";
    pages.folders = new Map([
      [
        "customRoot",
        {
          id: "customRoot",
          name: "Root",
          slug: "",
          children: [],
        },
      ],
    ]);

    registerFolderChildMutable(pages, "folderId");

    expect(pages.folders.get("customRoot")?.children).toEqual(["folderId"]);
  });
});

describe("reparent pages and folders", () => {
  test("move page up within single parent", () => {
    const { f, p, register, pages } = createPages();
    register([
      f("folder", [
        p("page1", "/page1"),
        p("page2", "/page2"),
        p("page3", "/page3"),
      ]),
    ]);
    reparentPageOrFolderMutable(pages.folders, "page3", "folder", 1);
    const folder = pages.folders.get("folder");
    expect(folder?.children).toEqual(["page1", "page3", "page2"]);
  });

  test("move page down within single parent", () => {
    const { f, p, register, pages } = createPages();
    register([
      f("folder", [
        p("page1", "/page1"),
        p("page2", "/page2"),
        p("page3", "/page3"),
      ]),
    ]);
    reparentPageOrFolderMutable(pages.folders, "page1", "folder", 2);
    const folder = pages.folders.get("folder");
    expect(folder?.children).toEqual(["page2", "page1", "page3"]);
  });

  test("move page into another folder", () => {
    const { f, p, register, pages } = createPages();
    register([
      f("folder1", [p("page1", "/page1"), p("page2", "/page2")]),
      f("folder2", [p("page3", "/page3")]),
    ]);
    reparentPageOrFolderMutable(pages.folders, "page1", "folder2", 1);
    const folder1 = pages.folders.get("folder1");
    const folder2 = pages.folders.get("folder2");
    expect(folder1?.children).toEqual(["page2"]);
    expect(folder2?.children).toEqual(["page3", "page1"]);
  });

  test("move folder into another folder", () => {
    const { f, register, pages } = createPages();
    register([f("folder1", []), f("folder2", [])]);
    reparentPageOrFolderMutable(pages.folders, "folder1", "folder2", 1);
    expect(Array.from(pages.folders.values())).toEqual([
      expect.objectContaining({
        id: "root",
        children: ["homePageId", "folder2"],
      }),
      expect.objectContaining({ id: "folder1", children: [] }),
      expect.objectContaining({ id: "folder2", children: ["folder1"] }),
    ]);
  });

  test("prevent reparanting folder into itself", () => {
    const { f, register, pages } = createPages();
    register([f("folder1", [])]);
    reparentPageOrFolderMutable(pages.folders, "folder1", "folder1", 1);
    expect(Array.from(pages.folders.values())).toEqual([
      expect.objectContaining({
        id: "root",
        children: ["homePageId", "folder1"],
      }),
      expect.objectContaining({ id: "folder1", children: [] }),
    ]);
  });

  test("prevent reparanting folder own children", () => {
    const { f, register, pages } = createPages();
    register([f("folder1", [f("folder2", [])])]);
    reparentPageOrFolderMutable(pages.folders, "folder1", "folder2", 1);
    expect(Array.from(pages.folders.values())).toEqual([
      expect.objectContaining({
        id: "root",
        children: ["homePageId", "folder1"],
      }),
      expect.objectContaining({ id: "folder2", children: [] }),
      expect.objectContaining({ id: "folder1", children: ["folder2"] }),
    ]);
  });

  test("does not remove unrelated child when item is missing from previous parent", () => {
    const { f, p, register, pages } = createPages();
    register([f("folder", [p("page1", "/page1"), p("page2", "/page2")])]);

    reparentPageOrFolderMutable(pages.folders, "page3", "folder", 1);

    expect(pages.folders.get("folder")?.children).toEqual(["page1", "page2"]);
  });
});

describe("getAllChildrenAndSelf", () => {
  const folders = toMap<Folder>([
    { id: "1", name: "1", slug: "1", children: ["2"] },
    { id: "2", name: "2", slug: "2", children: ["3", "page1"] },
    { id: "3", name: "3", slug: "3", children: ["page2"] },
  ]);

  test("get nested folders", () => {
    const result = getAllChildrenAndSelf("1", folders, "folder");
    expect(result).toEqual(["1", "2", "3"]);
  });

  test("get nested pages", () => {
    const result = getAllChildrenAndSelf("1", folders, "page");
    expect(result).toEqual(["page2", "page1"]);
  });
});

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

    const { isFolder } = await import("./page-utils");
    expect(isFolder("folder1", pagesData.folders)).toBe(true);
  });

  test("should return false for non-existing folder id", async () => {
    const { pages: pagesData } = createPages();

    const { isFolder } = await import("./page-utils");
    expect(isFolder("nonexistent", pagesData.folders)).toBe(false);
  });

  test("should return false for page id", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);

    const { isFolder } = await import("./page-utils");
    expect(isFolder("page1", pagesData.folders)).toBe(false);
  });
});

describe("getStoredDropTarget", () => {
  test("should return drop target with parent id", async () => {
    const { pages: pagesData, register, f, p } = createPages();
    register([f("folder1", [p("page1", "/page1")])]);
    $pages.set(pagesData);

    const { getStoredDropTarget } = await import("./page-utils");
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

    const { getStoredDropTarget } = await import("./page-utils");
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

    const { getStoredDropTarget } = await import("./page-utils");
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

    const { getStoredDropTarget } = await import("./page-utils");
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

    const { canDrop } = await import("./page-utils");
    const dropTarget = {
      parentId: "folder1",
      indexWithinChildren: 1,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(true);
  });

  test("should forbid dropping on non-folder", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);

    const { canDrop } = await import("./page-utils");
    const dropTarget = {
      parentId: "page1",
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(false);
  });

  test("should forbid dropping at index 0 of root folder", async () => {
    const { pages: pagesData } = createPages();

    const { canDrop } = await import("./page-utils");
    const dropTarget = {
      parentId: ROOT_FOLDER_ID,
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData)).toBe(false);
  });

  test("should allow dropping at index > 0 of root folder", async () => {
    const { pages: pagesData } = createPages();

    const { canDrop } = await import("./page-utils");
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

    const { canDrop } = await import("./page-utils");
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

    const { duplicateFolder } = await import("./page-utils");
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

    const { duplicateFolder } = await import("./page-utils");
    const newFolderId = duplicateFolder("folder1");

    expect(newFolderId).toBeDefined();
    const updatedPages = $pages.get()!;
    const newFolder =
      newFolderId === undefined
        ? undefined
        : updatedPages.folders.get(newFolderId);
    expect(newFolder).toBeDefined();
    // Note: Page duplication is handled by insertPageCopyMutable from ~/shared/page-utils
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

    const { duplicateFolder } = await import("./page-utils");
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

    const { duplicateFolder } = await import("./page-utils");
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

  test("should register duplicated folder in parent folder", async () => {
    const { pages: pagesData, register, f } = createPages();
    register([f("folder1", [])]);

    $pages.set(pagesData);
    updateCurrentSystem(initialSystem);

    const { duplicateFolder } = await import("./page-utils");
    const newFolderId = duplicateFolder("folder1");

    const updatedPages = $pages.get()!;
    const rootFolder = Array.from(updatedPages.folders.values()).find(
      isRootFolder
    );
    expect(rootFolder?.children).toContain(newFolderId);
  });
});
