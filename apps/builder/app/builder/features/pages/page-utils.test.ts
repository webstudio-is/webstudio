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
import {
  $dataSourceVariables,
  $dataSources,
  $pages,
  $project,
  $resources,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $awareness } from "~/shared/awareness";
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
    const rootFolder = folders.find(isRootFolder);

    for (const child of children) {
      childIds.push(child.id);
      if ("meta" in child) {
        pages.push(child);
        continue;
      }
      folders.push(child);

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
    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      title: `"Page"`,
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    reparentOrphansMutable(pages);
    const rootFolder = pages.folders.find(isRootFolder);
    expect(rootFolder).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      children: ["homePageId", "folderId", "pageId"],
    });
  });
});

describe("cleanupChildRefsMutable", () => {
  test("cleanup refs", () => {
    const {
      pages: { folders },
    } = createPages();
    folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    const rootFolder = folders.find(isRootFolder);
    rootFolder?.children.push("folderId");
    cleanupChildRefsMutable("folderId", folders);
    expect(rootFolder).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      children: ["homePageId"],
    });
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

  const rootFolder = folders.find(isRootFolder)!;

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
    const {
      pages: { folders },
    } = createPages();
    registerFolderChildMutable(folders, "folderId");
    const rootFolder = folders.find(isRootFolder);
    expect(rootFolder?.children).toEqual(["homePageId", "folderId"]);
  });

  test("register a folder child in a provided folder", () => {
    const {
      pages: { folders },
    } = createPages();
    const folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };
    folders.push(folder);
    registerFolderChildMutable(folders, "folderId2", "folderId");
    expect(folder.children).toEqual(["folderId2"]);
  });

  test("register in a provided folder & cleanup old refs", () => {
    const {
      pages: { folders },
    } = createPages();
    const folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };
    folders.push(folder);
    const rootFolder = folders.find(isRootFolder);
    registerFolderChildMutable(folders, "folderId", ROOT_FOLDER_ID);
    registerFolderChildMutable(folders, "folderId2", ROOT_FOLDER_ID);

    expect(rootFolder?.children).toEqual([
      "homePageId",
      "folderId",
      "folderId2",
    ]);

    // Moving folderId from root to folderId
    registerFolderChildMutable(folders, "folderId2", "folderId");

    expect(rootFolder?.children).toEqual(["homePageId", "folderId"]);
    expect(folder.children).toEqual(["folderId2"]);
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
    const folder = pages.folders.find((folder) => folder.id === "folder");
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
    const folder = pages.folders.find((folder) => folder.id === "folder");
    expect(folder?.children).toEqual(["page2", "page1", "page3"]);
  });

  test("move page into another folder", () => {
    const { f, p, register, pages } = createPages();
    register([
      f("folder1", [p("page1", "/page1"), p("page2", "/page2")]),
      f("folder2", [p("page3", "/page3")]),
    ]);
    reparentPageOrFolderMutable(pages.folders, "page1", "folder2", 1);
    const folder1 = pages.folders.find((folder) => folder.id === "folder1");
    const folder2 = pages.folders.find((folder) => folder.id === "folder2");
    expect(folder1?.children).toEqual(["page2"]);
    expect(folder2?.children).toEqual(["page3", "page1"]);
  });

  test("move folder into another folder", () => {
    const { f, register, pages } = createPages();
    register([f("folder1", []), f("folder2", [])]);
    reparentPageOrFolderMutable(pages.folders, "folder1", "folder2", 1);
    expect(pages.folders).toEqual([
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
    expect(pages.folders).toEqual([
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
    expect(pages.folders).toEqual([
      expect.objectContaining({
        id: "root",
        children: ["homePageId", "folder1"],
      }),
      expect.objectContaining({ id: "folder2", children: [] }),
      expect.objectContaining({ id: "folder1", children: ["folder2"] }),
    ]);
  });
});

describe("getAllChildrenAndSelf", () => {
  const folders: Array<Folder> = [
    {
      id: "1",
      name: "1",
      slug: "1",
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
      children: ["page2"],
    },
  ];

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
  const folders = (): Array<Folder> => [
    {
      id: "1",
      name: "1",
      slug: "1",
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
  ];

  test("delete empty folder", () => {
    const result = deleteFolderWithChildrenMutable("3", folders());
    expect(result).toEqual({ folderIds: ["3"], pageIds: [] });
  });

  test("delete folder with folders and pages", () => {
    const result = deleteFolderWithChildrenMutable("1", folders());
    expect(result).toEqual({
      folderIds: ["1", "2", "3"],
      pageIds: ["page1"],
    });
  });
});

test("page root scope should rely on selected page", () => {
  const pages = createDefaultPages({
    rootInstanceId: "homeRootId",
    homePageId: "homePageId",
  });
  pages.pages.push({
    id: "pageId",
    rootInstanceId: "pageRootId",
    name: "My Name",
    path: "/",
    title: `"My Title"`,
    meta: {},
  });
  $pages.set(pages);
  $awareness.set({ pageId: "pageId" });
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
  $awareness.set({ pageId: "homePageId" });
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
  $awareness.set({ pageId: "homePageId" });
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
  test("should delete a page from pages array", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1"), p("page2", "/page2")]);

    // Create minimal WebstudioData
    const data = {
      pages: pagesData,
      instances: new Map(),
    } as unknown as WebstudioData;

    deletePageMutable("page1", data);

    expect(pagesData.pages.find((page) => page.id === "page1")).toBeUndefined();
    expect(pagesData.pages.find((page) => page.id === "page2")).toBeDefined();
  });

  test("should delete page instance", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);

    const page = pagesData.pages.find((page) => page.id === "page1");
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

    const folder = pagesData.folders.find((folder) => folder.id === "folder1");
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

    expect(canDrop(dropTarget, pagesData.folders)).toBe(true);
  });

  test("should forbid dropping on non-folder", async () => {
    const { pages: pagesData, register, p } = createPages();
    register([p("page1", "/page1")]);

    const { canDrop } = await import("./page-utils");
    const dropTarget = {
      parentId: "page1",
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData.folders)).toBe(false);
  });

  test("should forbid dropping at index 0 of root folder", async () => {
    const { pages: pagesData } = createPages();

    const { canDrop } = await import("./page-utils");
    const dropTarget = {
      parentId: ROOT_FOLDER_ID,
      indexWithinChildren: 0,
    };

    expect(canDrop(dropTarget, pagesData.folders)).toBe(false);
  });

  test("should allow dropping at index > 0 of root folder", async () => {
    const { pages: pagesData } = createPages();

    const { canDrop } = await import("./page-utils");
    const dropTarget = {
      parentId: ROOT_FOLDER_ID,
      indexWithinChildren: 1,
    };

    expect(canDrop(dropTarget, pagesData.folders)).toBe(true);
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
    const newFolder = updatedPages.folders.find(
      (folder) => folder.id === newFolderId
    );
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
    const newFolder = updatedPages.folders.find(
      (folder) => folder.id === newFolderId
    );
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
    const newFolder = updatedPages.folders.find(
      (folder) => folder.id === newFolderId
    );
    expect(newFolder).toBeDefined();
    expect(newFolder?.children.length).toBeGreaterThan(0);

    // Check that subfolder was duplicated
    const subFolderChild = newFolder?.children.find((childId) =>
      updatedPages.folders.some((folder) => folder.id === childId)
    );
    expect(subFolderChild).toBeDefined();
    const subFolder = updatedPages.folders.find(
      (folder) => folder.id === subFolderChild
    );
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
    const newFolder = updatedPages.folders.find(
      (folder) => folder.id === newFolderId
    );
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
    const rootFolder = updatedPages.folders.find(isRootFolder);
    expect(rootFolder?.children).toContain(newFolderId);
  });
});
