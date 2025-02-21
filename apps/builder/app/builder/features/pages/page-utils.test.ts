import { describe, expect, test } from "vitest";
import { setEnv } from "@webstudio-is/feature-flags";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  isRootFolder,
  type Folder,
  ROOT_FOLDER_ID,
  type Page,
  SYSTEM_VARIABLE_ID,
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
} from "./page-utils";
import {
  $dataSourceVariables,
  $dataSources,
  $pages,
  $resourceValues,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { $awareness } from "~/shared/awareness";
import { updateCurrentSystem } from "~/shared/system";

setEnv("*");
registerContainers();

const initialSystem = {
  origin: "https://undefined.wstd.work",
  params: {},
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
  $resourceValues.set(new Map([["resourceId", "resource variable value"]]));
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
        search: {},
      },
    },
    variableValues: new Map([
      [
        "systemId",
        {
          params: {},
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
        search: {},
        origin: "https://undefined.wstd.work",
      },
    },
    variableValues: new Map([
      [
        "systemId",
        {
          params: { slug: "my-post" },
          search: {},
          origin: "https://undefined.wstd.work",
        },
      ],
    ]),
  });
});
