import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  elementComponent,
  isRootFolder,
  ROOT_FOLDER_ID,
  type Folder,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { createBuilderStateFromSnapshot } from "../state/adapters";
import { createRootFolder } from "../shared/pages-utils";
import {
  createFolderCreatePayload,
  createFolderDeletePayload,
  createFolderUpdatePayload,
  createFolderValue,
  createPageCreatePayload,
  createPageDeletePayload,
  createPageRootInstance,
  createPageUpdatePatches,
  createPageUpdatePayload,
  createPageValue,
  findFolder,
  findPage,
  findParentFolderId,
  findSerializedPageByInput,
  getAllChildrenAndSelf,
  getFolderChildReparentPlan,
  getFolderDeletionTargets,
  getHomePageRootInstanceId,
  getParentFolderId,
  getPageExpressionErrors,
  getSerializedPagePath,
  getSerializedPages,
  isPathAvailable,
  isSlugAvailable,
  pageFieldsInput,
  pageMetaInput,
  serializePageDetails,
  serializePageDetailsByInput,
  serializePageSummary,
  updatePage,
} from "./pages";

const createPages = () =>
  migratePages({
    meta: {},
    homePage: {
      id: "home",
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId: "homeBody",
    },
    pages: [
      {
        id: "page",
        name: "Page",
        path: "/page",
        title: `"Page"`,
        meta: {
          language: "en",
          socialImageAssetId: "asset",
        },
        rootInstanceId: "pageBody",
      },
    ],
    folders: [
      createRootFolder(["home", "page", "folder"]),
      { id: "folder", name: "Folder", slug: "folder", children: [] },
    ],
  });

test("creates the default page root instance", () => {
  expect(createPageRootInstance("root")).toEqual({
    type: "instance",
    id: "root",
    component: "ws:element",
    tag: "body",
    children: [],
  });
});

test("creates a page with title defaulting to name", () => {
  expect(
    createPageValue({
      pageId: "page",
      name: "Page",
      path: "/page",
      rootInstanceId: "root",
    })
  ).toEqual({
    id: "page",
    name: "Page",
    path: "/page",
    title: `"Page"`,
    rootInstanceId: "root",
    meta: {},
  });
});

test("creates page insertion payload", () => {
  const root = createPageRootInstance("root");
  const page = createPageValue({
    pageId: "page",
    name: "Page",
    path: "/page",
    rootInstanceId: root.id,
  });

  expect(
    createPageCreatePayload({
      page,
      parentFolderId: "folder",
      parentChildIndex: 2,
      rootInstance: root,
    })
  ).toEqual([
    {
      namespace: "pages",
      patches: [
        { op: "add", path: ["pages", "page"], value: page },
        {
          op: "add",
          path: ["folders", "folder", "children", 2],
          value: "page",
        },
      ],
    },
    {
      namespace: "instances",
      patches: [{ op: "add", path: ["root"], value: root }],
    },
  ]);
});

describe("serialized page helpers", () => {
  test("serializes page summary and details with parent folder", () => {
    const pages = createDefaultPages({
      rootInstanceId: "root",
      homePageId: "home",
    });
    const page = pages.pages.get("home");
    if (page === undefined) {
      throw new Error("Expected page");
    }
    page.meta = {
      description: "Description",
      excludePageFromSearch: "true",
      status: "200",
      auth: { method: "basic", login: "editor", password: "password123" },
    };
    const serializedPages = getSerializedPages({ pages });
    const serializedPage = serializedPages.pages.find(
      (item) => item.id === page.id
    );
    if (serializedPage === undefined) {
      throw new Error("Expected serialized page");
    }

    expect(findParentFolderId(serializedPages.folders, page.id)).toBe(
      pages.rootFolderId
    );
    expect(findPage(pages, "home")).toBe(page);
    expect(findPage(pages, "missing")).toBeUndefined();
    expect(findFolder(pages, pages.rootFolderId)?.id).toBe(pages.rootFolderId);
    expect(findFolder(pages, "missing")).toBeUndefined();
    expect(serializePageSummary(serializedPages, serializedPage)).toEqual({
      id: "home",
      name: "Home",
      path: "",
      localPath: "",
      title: '"Home"',
      rootInstanceId: "root",
      parentFolderId: pages.rootFolderId,
      isHome: true,
    });
    expect(serializePageDetails(serializedPages, serializedPage).meta).toEqual({
      description: "Description",
      language: undefined,
      redirect: undefined,
      status: "200",
      socialImageUrl: undefined,
      socialImageAssetId: undefined,
      excludePageFromSearch: true,
      documentType: "html",
      content: undefined,
      auth: { method: "basic", login: "editor", password: "password123" },
      custom: undefined,
    });
    expect(getHomePageRootInstanceId(pages)).toBe("root");
    expect(
      findSerializedPageByInput(serializedPages, { pagePath: "" })?.id
    ).toBe("home");
    expect(
      findSerializedPageByInput(serializedPages, { pagePath: "/" })?.id
    ).toBe("home");
    expect(serializePageDetailsByInput({ pages }, { pageId: "home" })).toEqual(
      expect.objectContaining({
        id: "home",
        path: "",
        isHome: true,
      })
    );
    expect(
      serializePageDetailsByInput({ pages }, { pageId: "missing" })
    ).toBeUndefined();
  });

  test("finds serialized pages by full folder-aware path", () => {
    const pages = createDefaultPages({
      rootInstanceId: "root",
      homePageId: "home",
    });
    pages.folders.set("folder", {
      id: "folder",
      name: "Blog",
      slug: "blog",
      children: ["post"],
    });
    pages.pages.set("post", {
      id: "post",
      name: "Post",
      path: "/first-post",
      title: '"Post"',
      rootInstanceId: "post-root",
      meta: {},
    });
    pages.folders.get(pages.rootFolderId)?.children.push("folder");

    const serializedPages = getSerializedPages({ pages });
    const post = serializedPages.pages.find((page) => page.id === "post");
    if (post === undefined) {
      throw new Error("Expected post page");
    }

    expect(getSerializedPagePath(serializedPages, post)).toBe(
      "/blog/first-post"
    );
    expect(
      findSerializedPageByInput(serializedPages, {
        pagePath: "/blog/first-post",
      })?.id
    ).toBe("post");
    expect(
      serializePageDetailsByInput({ pages }, { pagePath: "/blog/first-post" })
    ).toMatchObject({
      id: "post",
      path: "/blog/first-post",
      localPath: "/first-post",
    });
  });
});

describe("createPageDeletePayload", () => {
  test("removes page, folder child reference, and page instances", () => {
    const pages = createDefaultPages({
      rootInstanceId: "body",
      homePageId: "home",
    });
    pages.pages.set("page", {
      id: "page",
      name: "Page",
      path: "/page",
      title: '"Page"',
      rootInstanceId: "page-root",
      meta: {},
    });
    pages.folders.get(pages.rootFolderId)?.children.push("page");

    const state = createBuilderStateFromSnapshot({
      pages,
      instances: [
        [
          "page-root",
          {
            type: "instance",
            id: "page-root",
            component: elementComponent,
            children: [{ type: "id", value: "child" }],
          },
        ],
        [
          "child",
          {
            type: "instance",
            id: "child",
            component: elementComponent,
            children: [],
          },
        ],
      ],
      props: [],
      dataSources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    });
    const deleteState = {
      pages: state.pages!,
      instances: state.instances!,
      props: state.props!,
      dataSources: state.dataSources!,
      styleSources: state.styleSources!,
      styleSourceSelections: state.styleSourceSelections!,
      styles: state.styles!,
    };

    expect(
      createPageDeletePayload({
        state: deleteState,
        page: pages.pages.get("page")!,
        parentFolderId: pages.rootFolderId,
      })[0]
    ).toEqual({
      namespace: "pages",
      patches: [
        { op: "remove", path: ["pages", "page"] },
        {
          op: "remove",
          path: ["folders", pages.rootFolderId, "children", 1],
        },
      ],
    });
  });
});

describe("createFolderCreatePayload", () => {
  test("creates folder insertion payload", () => {
    const folder = createFolderValue({
      folderId: "folder",
      name: "Folder",
      slug: "folder",
    });

    expect(
      createFolderCreatePayload({
        folder,
        parentFolderId: "root",
        parentChildIndex: 1,
      })
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          { op: "add", path: ["folders", "folder"], value: folder },
          {
            op: "add",
            path: ["folders", "root", "children", 1],
            value: "folder",
          },
        ],
      },
    ]);
  });
});

describe("createFolderUpdatePayload", () => {
  test("creates field and reparent patches", () => {
    const pages = createDefaultPages({
      rootInstanceId: "body",
      homePageId: "home",
    });
    pages.folders.set("folder", {
      id: "folder",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    pages.folders.set("next", {
      id: "next",
      name: "Next",
      slug: "next",
      children: [],
    });
    pages.folders.get(pages.rootFolderId)?.children.push("folder", "next");

    expect(
      createFolderUpdatePayload({
        folder: pages.folders.get("folder")!,
        pages,
        values: {
          name: "Updated",
          slug: "updated",
          parentFolderId: "next",
        },
      })
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["folders", "folder", "name"],
            value: "Updated",
          },
          {
            op: "replace",
            path: ["folders", "folder", "slug"],
            value: "updated",
          },
          {
            op: "remove",
            path: ["folders", pages.rootFolderId, "children", 1],
          },
          {
            op: "add",
            path: ["folders", "next", "children", 0],
            value: "folder",
          },
        ],
      },
    ]);
  });
});

describe("createFolderDeletePayload", () => {
  test("removes folder subtree, pages, child reference, and page instances", () => {
    const pages = createDefaultPages({
      rootInstanceId: "body",
      homePageId: "home",
    });
    pages.folders.set("folder", {
      id: "folder",
      name: "Folder",
      slug: "folder",
      children: ["page"],
    });
    pages.pages.set("page", {
      id: "page",
      name: "Page",
      path: "/page",
      title: '"Page"',
      rootInstanceId: "page-root",
      meta: {},
    });
    pages.folders.get(pages.rootFolderId)?.children.push("folder");

    const state = createBuilderStateFromSnapshot({
      pages,
      instances: [
        [
          "page-root",
          {
            type: "instance",
            id: "page-root",
            component: elementComponent,
            children: [{ type: "id", value: "child" }],
          },
        ],
        [
          "child",
          {
            type: "instance",
            id: "child",
            component: elementComponent,
            children: [],
          },
        ],
      ],
      props: [],
      dataSources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    });
    const deleteState = {
      pages: state.pages!,
      instances: state.instances!,
      props: state.props!,
      dataSources: state.dataSources!,
      styleSources: state.styleSources!,
      styleSourceSelections: state.styleSourceSelections!,
      styles: state.styles!,
    };

    const result = createFolderDeletePayload({
      state: deleteState,
      folder: pages.folders.get("folder")!,
      parentFolderId: pages.rootFolderId,
    });

    expect(result.folderIds).toEqual(["folder"]);
    expect(result.pageIds).toEqual(["page"]);
    expect(result.payload[0]).toEqual({
      namespace: "pages",
      patches: [
        {
          op: "remove",
          path: ["folders", pages.rootFolderId, "children", 1],
        },
        { op: "remove", path: ["pages", "page"] },
        { op: "remove", path: ["folders", "folder"] },
      ],
    });
    expect(result.payload).toContainEqual({
      namespace: "instances",
      patches: [
        { op: "remove", path: ["page-root"] },
        { op: "remove", path: ["child"] },
      ],
    });
  });
});

describe("page input schemas", () => {
  test("parse page fields and metadata used by the API", () => {
    expect(
      pageFieldsInput.parse({
        name: "About",
        path: "/about",
        title: `"About"`,
        parentFolderId: "folder",
        meta: {
          description: `"About us"`,
          excludePageFromSearch: true,
          documentType: "html",
          custom: [{ property: "og:title", content: `"About"` }],
        },
      })
    ).toEqual({
      name: "About",
      path: "/about",
      title: `"About"`,
      parentFolderId: "folder",
      meta: {
        description: `"About us"`,
        excludePageFromSearch: true,
        documentType: "html",
        custom: [{ property: "og:title", content: `"About"` }],
      },
    });
  });

  test("reject empty page names, invalid document types, and invalid expressions", () => {
    expect(() => pageFieldsInput.parse({ name: "" })).toThrow();
    expect(() => pageMetaInput.parse({ documentType: "json" })).toThrow();
    expect(() =>
      pageFieldsInput.parse({
        title: "About us",
        meta: { description: "About us" },
      })
    ).toThrow();
    expect(() =>
      pageMetaInput.parse({
        custom: [{ property: "og:title", content: "About us" }],
      })
    ).toThrow();
  });

  test("reports page expression errors", () => {
    expect(
      getPageExpressionErrors({
        title: "About us",
        meta: {
          description: "About us",
          custom: [{ property: "og:title", content: "About us" }],
        },
      })
    ).toEqual([
      expect.stringMatching(/^title:/),
      expect.stringMatching(/^meta.description:/),
      expect.stringMatching(/^meta.custom.0.content:/),
    ]);
  });
});

describe("createPageUpdatePatches", () => {
  test("creates field, meta, and folder patches", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePatches({
        input: {
          name: "Updated",
          path: "/updated",
          meta: {
            language: "",
            excludePageFromSearch: true,
          },
          parentFolderId: "folder",
        },
        page: page!,
        pages,
      })
    ).toEqual([
      {
        op: "replace",
        path: ["pages", "page", "name"],
        value: "Updated",
      },
      {
        op: "replace",
        path: ["pages", "page", "path"],
        value: "/updated",
      },
      {
        op: "remove",
        path: ["pages", "page", "meta", "language"],
      },
      {
        op: "add",
        path: ["pages", "page", "meta", "excludePageFromSearch"],
        value: "true",
      },
      {
        op: "remove",
        path: ["folders", pages.rootFolderId, "children", 1],
      },
      {
        op: "add",
        path: ["folders", "folder", "children", 0],
        value: "page",
      },
    ]);
  });

  test("does not remove omitted metadata fields", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePatches({
        input: {
          meta: {
            description: "Updated",
          },
        },
        page: page!,
        pages,
      })
    ).toEqual([
      {
        op: "add",
        path: ["pages", "page", "meta", "description"],
        value: "Updated",
      },
    ]);
  });
});

describe("createPageUpdatePayload", () => {
  test("wraps page update patches in a build payload", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePayload({
        input: { name: "Updated" },
        page: page!,
        pages,
      })
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["pages", "page", "name"],
            value: "Updated",
          },
        ],
      },
    ]);
  });

  test("returns empty payload for noop updates", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePayload({
        input: {},
        page: page!,
        pages,
      })
    ).toEqual([]);
  });
});

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item]));

const createRuntimePages = () => {
  const data = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    homePageId: "homePageId",
  });

  const { pages, folders } = data;

  function f(id: string, children?: Array<Page | Folder>): Folder;
  function f(id: string, slug: string, children?: Array<Page | Folder>): Folder;
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

describe("folder child parent helpers", () => {
  test("finds parent folder id for a child", () => {
    const { pages, f, p, register } = createRuntimePages();
    const page = p("page", "/page");
    register([f("folder", [page])]);

    expect(getParentFolderId(pages.folders, page.id)).toBe("folder");
    expect(getParentFolderId(pages.folders, "missing")).toBeUndefined();
  });

  test("plans cross-folder reparent", () => {
    const { pages, f, p, register } = createRuntimePages();
    const page = p("page", "/page");
    register([f("folder", [page]), f("target", [])]);

    expect(
      getFolderChildReparentPlan(pages.folders, page.id, "target")
    ).toEqual({
      currentFolderId: "folder",
      currentIndex: 0,
      nextFolderId: "target",
      nextIndex: 0,
    });
  });

  test("does not plan same-folder reparent", () => {
    const { pages, f, p, register } = createRuntimePages();
    const page = p("page", "/page");
    register([f("folder", [page])]);

    expect(
      getFolderChildReparentPlan(pages.folders, page.id, "folder")
    ).toBeUndefined();
  });
});

describe("isSlugAvailable", () => {
  const {
    pages: { folders },
    register,
    f,
  } = createRuntimePages();

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
  const { f, p, register, pages } = createRuntimePages();

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

describe("getFolderDeletionTargets", () => {
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

  test("returns nested folders and pages", () => {
    expect(getFolderDeletionTargets("2", pages())).toEqual({
      folderIds: ["2", "3"],
      pageIds: ["page1"],
    });
  });

  test("returns no targets for root folder", () => {
    expect(getFolderDeletionTargets(ROOT_FOLDER_ID, pages())).toEqual({
      folderIds: [],
      pageIds: [],
    });
  });

  test("returns no targets for folder containing home page", () => {
    const pagesData = pages();
    pagesData.folders.get("2")?.children.push("homePageId");

    expect(getFolderDeletionTargets("2", pagesData)).toEqual({
      folderIds: [],
      pageIds: [],
    });
  });
});

describe("updatePage", () => {
  test("rejects invalid page metadata expressions before patching", () => {
    const pages = createPages();

    expect(() =>
      updatePage(
        { pages },
        {
          pageId: "page",
          values: {
            title: "Pricing Plans",
            meta: {
              description: "Plans for teams",
            },
          },
        }
      )
    ).toThrow(/title:/);
  });

  test("accepts string literal page metadata expressions", () => {
    const pages = createPages();

    expect(
      updatePage(
        { pages },
        {
          pageId: "page",
          values: {
            title: `"Pricing Plans"`,
            meta: {
              description: `"Plans for teams"`,
            },
          },
        }
      ).payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["pages", "page", "title"],
            value: `"Pricing Plans"`,
          },
          {
            op: "add",
            path: ["pages", "page", "meta", "description"],
            value: `"Plans for teams"`,
          },
        ],
      },
    ]);
  });
});
