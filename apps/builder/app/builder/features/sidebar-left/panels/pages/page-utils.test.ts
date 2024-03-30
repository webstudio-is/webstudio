import { describe, expect, test } from "@jest/globals";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  isRoot,
  type Folder,
  Instance,
  DataSource,
  encodeDataSourceVariable,
  ROOT_FOLDER_ID,
} from "@webstudio-is/sdk";
import {
  cleanupChildRefsMutable,
  deleteFolderWithChildrenMutable,
  getAllChildrenAndSelf,
  isSlugAvailable,
  registerFolderChildMutable,
  reparentOrphansMutable,
  toTreeData,
  filterSelfAndChildren,
  getExistingRoutePaths,
  duplicatePage,
  $editingPagesItemId,
  $pageRootScope,
} from "./page-utils";
import {
  $dataSourceVariables,
  $dataSources,
  $instances,
  $pages,
  $project,
  $resourceValues,
  $selectedPageId,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";

registerContainers();

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

describe("toTreeData", () => {
  test("initial pages always has home pages and a root folder", () => {
    const pages = createDefaultPages({
      rootInstanceId: "id",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    const tree = toTreeData(pages);
    expect(tree.root).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      type: "folder",
      children: [
        {
          data: {
            id: "homePageId",
            meta: {},
            name: "Home",
            path: "",
            rootInstanceId: "id",
            systemDataSourceId: "systemDataSourceId",
            title: `"Home"`,
          },
          id: "homePageId",
          type: "page",
        },
      ],
    });
  });

  test("add empty folder", () => {
    const pages = createDefaultPages({
      rootInstanceId: "id",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    const rootFolder = pages.folders.find(isRoot);
    rootFolder?.children.push("folderId");
    const tree = toTreeData(pages);
    expect(tree.root).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      type: "folder",
      children: [
        {
          data: {
            id: "homePageId",
            meta: {},
            name: "Home",
            path: "",
            rootInstanceId: "id",
            systemDataSourceId: "systemDataSourceId",
            title: `"Home"`,
          },
          id: "homePageId",
          type: "page",
        },
        {
          type: "folder",
          id: "folderId",
          name: "Folder",
          slug: "folder",
          children: [],
        },
      ],
    });
  });

  test("add a page inside a folder", () => {
    const pages = createDefaultPages({
      rootInstanceId: "id",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "id",
      systemDataSourceId: "systemDataSourceId",
      title: `"Page"`,
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: ["pageId"],
    });
    const rootFolder = pages.folders.find(isRoot);
    rootFolder?.children.push("folderId");
    const tree = toTreeData(pages);

    expect(tree.root).toEqual({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      type: "folder",
      children: [
        {
          data: {
            id: "homePageId",
            meta: {},
            name: "Home",
            path: "",
            rootInstanceId: "id",
            systemDataSourceId: "systemDataSourceId",
            title: `"Home"`,
          },
          id: "homePageId",
          type: "page",
        },
        {
          type: "folder",
          id: "folderId",
          name: "Folder",
          slug: "folder",
          children: [
            {
              type: "page",
              id: "pageId",
              data: {
                id: "pageId",
                meta: {},
                name: "Page",
                path: "/page",
                rootInstanceId: "id",
                systemDataSourceId: "systemDataSourceId",
                title: `"Page"`,
              },
            },
          ],
        },
      ],
    });
  });

  test("nest a folder", () => {
    const pages = createDefaultPages({
      rootInstanceId: "id",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    const rootFolder = pages.folders.find(isRoot);
    rootFolder?.children.push("1");
    pages.folders.push({
      id: "1",
      name: "Folder 1",
      slug: "folder-1",
      children: ["1-1"],
    });
    pages.folders.push({
      id: "1-1",
      name: "Folder 1-1",
      slug: "folder-1-1",
      children: [],
    });
    const tree = toTreeData(pages);
    expect(tree.root).toEqual({
      type: "folder",
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      children: [
        {
          type: "page",
          id: "homePageId",
          data: {
            id: "homePageId",
            name: "Home",
            path: "",
            title: `"Home"`,
            meta: {},
            rootInstanceId: "id",
            systemDataSourceId: "systemDataSourceId",
          },
        },
        {
          type: "folder",
          id: "1",
          name: "Folder 1",
          slug: "folder-1",
          children: [
            {
              type: "folder",
              id: "1-1",
              name: "Folder 1-1",
              slug: "folder-1-1",
              children: [],
            },
          ],
        },
      ],
    });
  });
});

describe("reparentOrphansMutable", () => {
  // We must deal with the fact there can be an orphaned folder or page in a collaborative mode,
  // because user A can add a page to a folder while user B deletes the folder without receiving the create page yet.
  test("reparent orphans to the root", () => {
    const pages = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      title: `"Page"`,
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    reparentOrphansMutable(pages);
    const rootFolder = pages.folders.find(isRoot);
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
    const { folders } = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    const rootFolder = folders.find(isRoot);
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
  const { folders } = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    systemDataSourceId: "systemDataSourceId",
    homePageId: "homePageId",
  });
  folders.push({
    id: "folderId1",
    name: "Folder 1",
    slug: "slug1",
    children: ["folderId1-1"],
  });
  folders.push({
    id: "folderId1-1",
    name: "Folder 1-1",
    slug: "slug1-1",
    children: [],
  });
  folders.push({
    id: "folderId2-1",
    name: "Folder 2-1",
    slug: "",
    children: [],
  });
  folders.push({
    id: "folderId2-2",
    name: "Folder 2-2",
    slug: "",
    children: [],
  });
  const rootFolder = folders.find(isRoot)!;
  rootFolder.children.push("folderId1");

  test("available in the root", () => {
    expect(isSlugAvailable("slug", folders, rootFolder.id)).toBe(true);
  });

  test("not available in the root", () => {
    expect(isSlugAvailable("slug1", folders, rootFolder.id)).toBe(false);
  });

  test("available in Folder 1", () => {
    expect(isSlugAvailable("slug", folders, "folderId1")).toBe(true);
  });

  test("not available in Folder 1", () => {
    expect(isSlugAvailable("slug1-1", folders, "folderId1")).toBe(false);
  });

  test("existing folder can have a matching slug when its the same id/folder", () => {
    expect(
      isSlugAvailable("slug1-1", folders, "folderId1", "folderId1-1")
    ).toBe(true);
  });

  test("empty folder slug can be defined multiple times", () => {
    expect(isSlugAvailable("", folders, "rootInstanceId")).toBe(true);
  });
});

describe("registerFolderChildMutable", () => {
  test("register a folder child in the root via fallback", () => {
    const { folders } = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    registerFolderChildMutable(folders, "folderId");
    const rootFolder = folders.find(isRoot);
    expect(rootFolder?.children).toEqual(["homePageId", "folderId"]);
  });

  test("register a folder child in a provided folder", () => {
    const { folders } = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
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
    const { folders } = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    });
    const folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };
    folders.push(folder);
    const rootFolder = folders.find(isRoot);
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

describe("filterSelfAndChildren", () => {
  const folders = [
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
      children: ["page1"],
    },
    {
      id: "3",
      name: "3",
      slug: "3",
      children: [],
    },
  ];

  test("filter self and child folders", () => {
    const result = filterSelfAndChildren("1", folders);
    expect(result).toEqual([folders[2]]);
  });
});

describe("getExistingRoutePaths", () => {
  const pages = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    systemDataSourceId: "systemDataSourceId",
    homePageId: "homePageId",
  });

  test("gets all the route paths that exists in the project", () => {
    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      title: `"Page"`,
    });

    pages.pages.push({
      id: "blogId",
      meta: {},
      name: "Blog",
      path: "/blog/:id",
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      title: `"Blog"`,
    });

    const result = getExistingRoutePaths(pages);
    expect(Array.from(result)).toEqual(["/page", "/blog/:id"]);
  });
});

describe("duplicate page", () => {
  $project.set({ id: "projectId" } as Project);

  test("home page with new root instance and system data source", () => {
    $instances.set(
      toMap<Instance>([
        { type: "instance", id: "body", component: "Body", children: [] },
      ])
    );
    $dataSources.set(
      toMap<DataSource>([
        {
          id: "system",
          scopeInstanceId: "body",
          name: "system",
          type: "parameter",
        },
      ])
    );
    $pages.set({
      homePage: {
        id: "pageId",
        name: "My Name",
        path: "/",
        title: `"My Title"`,
        meta: {},
        rootInstanceId: "body",
        systemDataSourceId: "system",
      },
      pages: [],
      folders: [],
    });
    duplicatePage("pageId");
    const newPage = $pages.get()?.pages[0];
    if (newPage === undefined) {
      throw Error("New page does not exist");
    }
    expect(newPage).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "My Name (1)",
      path: "/copy-1",
      title: `"My Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("body"),
      systemDataSourceId: expect.not.stringMatching("system"),
    });
    expect($dataSources.get()).toEqual(
      toMap<DataSource>([
        {
          id: "system",
          scopeInstanceId: "body",
          name: "system",
          type: "parameter",
        },
        {
          // @todo remove cast after releasing system variable migration
          id: newPage.systemDataSourceId!,
          scopeInstanceId: newPage.rootInstanceId,
          name: "system",
          type: "parameter",
        },
      ])
    );
    expect($instances.get()).toEqual(
      toMap<Instance>([
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [],
        },
        {
          type: "instance",
          id: newPage.rootInstanceId,
          component: "Body",
          children: [],
        },
      ])
    );
  });

  test("non-home page preserving old path and name with prefix", () => {
    $instances.set(
      toMap([{ type: "instance", id: "body", component: "Body", children: [] }])
    );
    $pages.set({
      homePage: {
        id: "homeId",
        name: "Home",
        path: "/",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "home",
        systemDataSourceId: "homeSystem",
      },
      pages: [
        {
          id: "pageId",
          name: "My Name (1)",
          path: "/my-path",
          title: `"My Title"`,
          meta: {},
          rootInstanceId: "body",
          systemDataSourceId: "pageSystem",
        },
      ],
      folders: [],
    });
    duplicatePage("pageId");
    expect($pages.get()?.pages[1]).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "My Name (2)",
      path: "/copy-1/my-path",
      title: `"My Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("body"),
    });
  });

  test("handle wildcards", () => {
    $instances.set(
      toMap([{ type: "instance", id: "body", component: "Body", children: [] }])
    );
    $pages.set({
      homePage: {
        id: "homeId",
        name: "Home",
        path: "/",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "home",
        systemDataSourceId: "system",
      },
      pages: [
        {
          id: "pageId1",
          name: "My Name 1",
          path: "/my-path/*",
          title: `"My Title"`,
          meta: {},
          rootInstanceId: "body",
          systemDataSourceId: "system",
        },
        {
          id: "pageId2",
          name: "My Name 2",
          // Named wildcard
          path: "/my-path/name*",
          title: `"My Title"`,
          meta: {},
          rootInstanceId: "body",
          systemDataSourceId: "system",
        },
      ],
      folders: [],
    });
    duplicatePage("pageId1");
    duplicatePage("pageId2");
    expect($pages.get()?.pages[2]).toEqual({
      id: expect.not.stringMatching("pageId1"),
      name: "My Name 1 (1)",
      path: "/copy-1/my-path/*",
      title: `"My Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("body"),
      systemDataSourceId: expect.not.stringMatching("system"),
    });
    expect($pages.get()?.pages[3]).toEqual({
      id: expect.not.stringMatching("pageId2"),
      name: "My Name 2 (1)",
      path: "/copy-1/my-path/name*",
      title: `"My Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("body"),
      systemDataSourceId: expect.not.stringMatching("system"),
    });
  });

  test("check full page path when duplicating inside a folder", () => {
    $instances.set(
      toMap([{ type: "instance", id: "body", component: "Body", children: [] }])
    );
    $pages.set({
      homePage: {
        id: "homeId",
        name: "Home",
        path: "/",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "home",
        systemDataSourceId: "system",
      },
      pages: [
        {
          id: "pageId",
          name: "My Name",
          path: "/my-path",
          title: `"My Title"`,
          meta: {},
          rootInstanceId: "body",
          systemDataSourceId: "system",
        },
      ],
      folders: [
        {
          id: "folderId",
          name: "Folder",
          slug: "folder",
          children: ["pageId"],
        },
      ],
    });
    duplicatePage("pageId");
    expect($pages.get()?.pages[1]).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "My Name (1)",
      path: "/copy-1/my-path",
      title: `"My Title"`,
      meta: {},
      rootInstanceId: expect.not.stringMatching("body"),
      systemDataSourceId: expect.not.stringMatching("system"),
    });
  });

  test("replace variables in page meta", () => {
    $instances.set(
      toMap([{ type: "instance", id: "body", component: "Body", children: [] }])
    );
    $dataSources.set(
      toMap([
        {
          id: "variableId",
          scopeInstanceId: "body",
          name: "My Variable",
          type: "variable",
          value: { type: "string", value: "value" },
        },
      ])
    );
    $pages.set({
      homePage: {
        id: "pageId",
        name: "My Name",
        path: "/",
        title: `"Title: " + $ws$dataSource$variableId`,
        meta: {
          description: `"Description: " + $ws$dataSource$variableId`,
          excludePageFromSearch: `"Exclude: " + $ws$dataSource$variableId`,
          socialImageUrl: `"Image: " + $ws$dataSource$variableId`,
          custom: [
            {
              property: "Name",
              content: `"Name: " + $ws$dataSource$variableId`,
            },
          ],
        },
        rootInstanceId: "body",
        systemDataSourceId: "system",
      },
      pages: [],
      folders: [],
    });
    duplicatePage("pageId");
    const [_oldDataSource, newDataSource] = $dataSources.get().values();
    const newVariableName = encodeDataSourceVariable(newDataSource.id);
    expect(newVariableName).not.toEqual("$ws$dataSource$variableId");
    expect($pages.get()?.pages[0]).toEqual({
      id: expect.not.stringMatching("pageId"),
      name: "My Name (1)",
      path: "/copy-1",
      title: `"Title: " + ${newVariableName}`,
      meta: {
        description: `"Description: " + ${newVariableName}`,
        excludePageFromSearch: `"Exclude: " + ${newVariableName}`,
        socialImageUrl: `"Image: " + ${newVariableName}`,
        custom: [
          {
            property: "Name",
            content: `"Name: " + ${newVariableName}`,
          },
        ],
      },
      rootInstanceId: expect.not.stringMatching("body"),
      systemDataSourceId: expect.not.stringMatching("system"),
    });
  });
});

test("page root scope should rely on editing page", () => {
  const pages = createDefaultPages({
    rootInstanceId: "homeRootId",
    homePageId: "homePageId",
    systemDataSourceId: "system",
  });
  pages.pages.push({
    id: "pageId",
    rootInstanceId: "pageRootId",
    name: "My Name",
    path: "/",
    title: `"My Title"`,
    meta: {},
    systemDataSourceId: "system",
  });
  $pages.set(pages);
  $selectedPageId.set("homePageId");
  $editingPagesItemId.set("pageId");
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
    aliases: new Map([["$ws$dataSource$2", "page variable"]]),
    scope: { $ws$dataSource$2: "" },
    variableValues: new Map([["2", ""]]),
  });
});

test("page root scope should use variable and resource values", () => {
  $pages.set(
    createDefaultPages({
      rootInstanceId: "homeRootId",
      homePageId: "homePageId",
      systemDataSourceId: "system",
    })
  );
  $editingPagesItemId.set("homePageId");
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
      ["$ws$dataSource$valueVariableId", "value variable"],
      ["$ws$dataSource$resourceVariableId", "resource variable"],
    ]),
    scope: {
      $ws$dataSource$resourceVariableId: "resource variable value",
      $ws$dataSource$valueVariableId: "value variable value",
    },
    variableValues: new Map([
      ["valueVariableId", "value variable value"],
      ["resourceVariableId", "resource variable value"],
    ]),
  });
});

test("page root scope should prefill default system variable value", () => {
  $pages.set(
    createDefaultPages({
      rootInstanceId: "homeRootId",
      homePageId: "homePageId",
      systemDataSourceId: "systemId",
    })
  );
  $editingPagesItemId.set("homePageId");
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
      $ws$dataSource$systemId: { params: {}, search: {} },
    },
    variableValues: new Map([["systemId", { params: {}, search: {} }]]),
  });

  $dataSourceVariables.set(
    new Map([["systemId", { params: { slug: "my-post" }, search: {} }]])
  );
  expect($pageRootScope.get()).toEqual({
    aliases: new Map([["$ws$dataSource$systemId", "system"]]),
    scope: {
      $ws$dataSource$systemId: { params: { slug: "my-post" }, search: {} },
    },
    variableValues: new Map([
      ["systemId", { params: { slug: "my-post" }, search: {} }],
    ]),
  });
});
