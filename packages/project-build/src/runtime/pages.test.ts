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
import { getZodValidationIssues } from "./errors";
import {
  createFolderCreatePayload,
  createFolderDeletePayload,
  createFolderUpdatePayload,
  createFolderValue,
  createPage,
  createPageAuthFromCredentials,
  createPageCreatePayload,
  createPageDeletePayload,
  createPageRootInstance,
  createPageUpdatePatches,
  createPageUpdatePayload,
  createPageValue,
  canDropPageTarget,
  findFolder,
  findPage,
  findParentFolderId,
  findSerializedPageByInput,
  getAllChildrenAndSelf,
  getFolderChildReparentPlan,
  getFolderSettingsValues,
  getNewFolderSettingsValues,
  getOrderedFolderChildReparentPlan,
  getFolderDeletionTargets,
  getHomePageRootInstanceId,
  getStoredPageDropTarget,
  computePageSettingsPath,
  getParentFolderId,
  getPageExpressionErrors,
  getPageByPath,
  getInitialPageSettingsMeta,
  getPageSettingsAuthFromValues,
  getPageSettingsUpdateData,
  getPageSettingsValues,
  getSerializedPagePath,
  getSerializedPages,
  homePageGeneralSettingsInput,
  isPathAvailable,
  isSlugAvailable,
  folderCreateInput,
  folderSettingsDefaultValues,
  folderSettingsInput,
  folderUpdateInput,
  nameToSlug,
  nameToPath,
  pageCreateInput,
  pageCustomMetadataSettingsInput,
  pageFieldsInput,
  pageGeneralSettingsInput,
  pageMetaInput,
  pageSearchSettingsInput,
  pageSocialImageSettingsInput,
  pageTemplateSettingsInput,
  pageTextContentSettingsInput,
  pageSettingsDefaultValues,
  reparentOrphans,
  reparentOrphansMutable,
  savePagePathInHistory,
  serializePageDetails,
  serializePageDetailsByInput,
  serializePageSummary,
  setHomePage,
  movePageTreeItem,
  updatePage,
  updatePageSettings,
  updatePageMarketplace,
  validateFolderSettings,
  validatePageSettings,
  type PageSettingsValues,
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

const createRuntimePageSettingsValues = (
  values: Partial<PageSettingsValues> = {}
): PageSettingsValues => ({
  ...pageSettingsDefaultValues,
  auth: { ...pageSettingsDefaultValues.auth },
  customMetas: [...pageSettingsDefaultValues.customMetas],
  marketplace: { ...pageSettingsDefaultValues.marketplace },
  ...values,
});

describe("page settings values", () => {
  test("serializes valid auth and omits empty or invalid auth", () => {
    expect(
      getPageSettingsAuthFromValues(createRuntimePageSettingsValues())
    ).toBeUndefined();
    expect(
      getPageSettingsAuthFromValues(
        createRuntimePageSettingsValues({
          auth: {
            login: "admin",
            password: "secret",
          },
        })
      )
    ).toEqual({
      method: "basic",
      login: "admin",
      password: "secret",
    });
    expect(
      getPageSettingsAuthFromValues(
        createRuntimePageSettingsValues({
          auth: {
            login: "admin:root",
            password: "secret",
          },
        })
      )
    ).toBeUndefined();
  });

  test("omits auth key from initial page meta when auth is empty", () => {
    expect(
      getInitialPageSettingsMeta(createRuntimePageSettingsValues())
    ).toEqual({});
    expect(
      getInitialPageSettingsMeta(
        createRuntimePageSettingsValues({
          auth: {
            login: "admin",
            password: "secret",
          },
        })
      )
    ).toEqual({
      auth: {
        method: "basic",
        login: "admin",
        password: "secret",
      },
    });
  });

  test("maps page metadata into settings values", () => {
    const pages = createPages();
    const page = pages.pages.get("page")!;
    page.meta = {
      ...page.meta,
      auth: {
        method: "basic",
        login: "admin",
        password: "secret",
      },
      content: "Hello",
    };

    expect(
      getPageSettingsValues({ page, pages, isHomePage: false }).auth
    ).toEqual({
      login: "admin",
      password: "secret",
    });
    expect(
      getPageSettingsValues({ page, pages, isHomePage: false }).content
    ).toBe("Hello");
  });

  test("creates page update, marketplace, and home intents from settings values", () => {
    const pages = createPages();
    const page = pages.pages.get("page")!;
    const result = getPageSettingsUpdateData({
      page,
      pages,
      values: {
        name: "Landing",
        description: '"Welcome"',
        customMetas: [{ property: "og:type", content: '"website"' }],
        auth: { login: "admin", password: "secret" },
        marketplace: {
          include: true,
          category: "Marketing",
          thumbnailAssetId: "asset-id",
        },
        isHomePage: true,
      },
    });

    expect(result).toEqual({
      pageValues: {
        name: "Landing",
        meta: {
          description: '"Welcome"',
          custom: [{ property: "og:type", content: '"website"' }],
          auth: {
            method: "basic",
            login: "admin",
            password: "secret",
          },
        },
      },
      marketplace: {
        include: true,
        category: "Marketing",
        thumbnailAssetId: "asset-id",
      },
      shouldSetHomePage: true,
    });
  });

  test("forwards a cleared status code so the patch removes it", () => {
    const pages = createPages();
    const page = pages.pages.get("page")!;
    page.meta.status = "302";

    const result = getPageSettingsUpdateData({
      page,
      pages,
      values: { status: undefined },
    });
    expect(Object.hasOwn(result.pageValues.meta ?? {}, "status")).toBe(true);
    expect(result.pageValues.meta?.status).toBeUndefined();

    expect(
      createPageUpdatePatches({ input: result.pageValues, page, pages })
    ).toEqual([{ op: "remove", path: ["pages", "page", "meta", "status"] }]);
  });

  test("does not touch status when it is not part of the update", () => {
    const pages = createPages();
    const page = pages.pages.get("page")!;
    page.meta.status = "302";

    const result = getPageSettingsUpdateData({
      page,
      pages,
      values: { title: "Landing" },
    });
    expect(Object.hasOwn(result.pageValues.meta ?? {}, "status")).toBe(false);
  });
});

describe("page drop targets", () => {
  test("resolves stored drop target from tree selector levels", () => {
    const pages = createPages();
    pages.folders.set("folder1", {
      id: "folder1",
      name: "Folder",
      slug: "folder",
      children: ["page1", "page2"],
    });

    expect(
      getStoredPageDropTarget({
        selector: ["page1", "folder1", ROOT_FOLDER_ID],
        dropTarget: { parentLevel: 1, beforeLevel: 1 },
        pages,
      })
    ).toEqual({
      parentId: "folder1",
      beforeId: "folder1",
      afterId: undefined,
      indexWithinChildren: 0,
    });
    expect(
      getStoredPageDropTarget({
        selector: ["page2", "folder1", ROOT_FOLDER_ID],
        dropTarget: { parentLevel: 1, beforeLevel: 0 },
        pages,
      })?.indexWithinChildren
    ).toBe(0);
    expect(
      getStoredPageDropTarget({
        selector: ["page1", "folder1", ROOT_FOLDER_ID],
        dropTarget: { parentLevel: 1, afterLevel: 0 },
        pages,
      })?.indexWithinChildren
    ).toBe(0);
    expect(
      getStoredPageDropTarget({
        selector: ["page1"],
        dropTarget: { parentLevel: 5 },
        pages,
      })
    ).toBeUndefined();
  });

  test("allows drops only inside folders and never before root home page", () => {
    const pages = createPages();
    pages.pages.set("page1", {
      id: "page1",
      name: "Page",
      path: "/page",
      title: `"Page"`,
      meta: {},
      rootInstanceId: "pageBody",
    });
    pages.folders.set("folder1", {
      id: "folder1",
      name: "Folder",
      slug: "folder",
      children: [],
    });

    expect(
      canDropPageTarget({ parentId: "folder1", indexWithinChildren: 1 }, pages)
    ).toBe(true);
    expect(
      canDropPageTarget({ parentId: "page1", indexWithinChildren: 0 }, pages)
    ).toBe(false);
    expect(
      canDropPageTarget(
        { parentId: ROOT_FOLDER_ID, indexWithinChildren: 0 },
        pages
      )
    ).toBe(false);
    expect(
      canDropPageTarget(
        { parentId: ROOT_FOLDER_ID, indexWithinChildren: 1 },
        pages
      )
    ).toBe(true);

    pages.rootFolderId = "customRoot";
    pages.folders.set("customRoot", {
      id: "customRoot",
      name: "Root",
      slug: "",
      children: [],
    });
    expect(
      canDropPageTarget(
        { parentId: "customRoot", indexWithinChildren: 0 },
        pages
      )
    ).toBe(false);
  });
});

const createIdFactory = () => {
  const ids = ["page-id", "root-instance-id"];
  return () => ids.shift() ?? "extra-id";
};

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

test("creates page auth from credentials", () => {
  expect(
    createPageAuthFromCredentials({ login: "admin", password: "secret" })
  ).toEqual({
    method: "basic",
    login: "admin",
    password: "secret",
  });
  expect(
    createPageAuthFromCredentials({ login: "admin:root", password: "secret" })
  ).toBeUndefined();
});

test("rejects client-supplied generated ids on create inputs", () => {
  expect(
    pageCreateInput.safeParse({
      pageId: "client-page-id",
      name: "Page",
      path: "/page",
    }).success
  ).toBe(false);
  expect(
    folderCreateInput.safeParse({
      folderId: "client-folder-id",
      name: "Folder",
      slug: "folder",
    }).success
  ).toBe(false);
});

test("validates folder slug inputs with the shared folder schema", () => {
  expect(
    folderSettingsInput.safeParse({
      name: "Folder",
      slug: "valid-folder-1",
      parentFolderId: "root",
    }).success
  ).toBe(true);
  expect(
    folderSettingsInput.safeParse({
      name: "Folder",
      slug: "valid-folder-1",
    }).success
  ).toBe(false);
  expect(
    folderCreateInput.safeParse({
      name: "Folder",
      slug: "valid-folder-1",
    }).success
  ).toBe(true);
  expect(
    folderCreateInput.safeParse({
      name: "Folder",
      slug: "Invalid Folder",
    }).success
  ).toBe(false);
  expect(
    folderUpdateInput.safeParse({
      folderId: "folder",
      values: { slug: "invalid/folder" },
    }).success
  ).toBe(false);
});

test("maps folder settings values from pages and defaults", () => {
  const pages = createPages();

  expect(nameToSlug("Team Updates")).toBe("team-updates");
  expect(nameToSlug("")).toBe("");
  expect(getNewFolderSettingsValues(undefined)).toEqual(
    folderSettingsDefaultValues
  );
  expect(getNewFolderSettingsValues(pages)).toEqual({
    ...folderSettingsDefaultValues,
    parentFolderId: pages.rootFolderId,
  });
  expect(
    getFolderSettingsValues({
      folderId: "folder",
      pages,
    })
  ).toEqual({
    name: "Folder",
    slug: "folder",
    parentFolderId: pages.rootFolderId,
  });
});

test("validates page metadata section inputs", () => {
  expect(pageTextContentSettingsInput.parse({ content: "Plain text" })).toEqual(
    {
      content: "Plain text",
    }
  );
  expect(pageSocialImageSettingsInput.parse({ socialImageUrl: "" })).toEqual({
    socialImageUrl: "",
  });
  expect(
    pageCustomMetadataSettingsInput.parse({
      customMetas: [{ property: "og:title", content: "Title" }],
    })
  ).toEqual({
    customMetas: [{ property: "og:title", content: "Title" }],
  });
  expect(
    pageCustomMetadataSettingsInput.safeParse({
      customMetas: [{ property: "og:title", content: 42 }],
    }).success
  ).toBe(false);
});

test("validates folder settings with sibling slug conflicts", () => {
  const pages = createDefaultPages({ rootInstanceId: "body" });
  const rootFolder = pages.folders.get(ROOT_FOLDER_ID)!;
  const existingFolder: Folder = {
    id: "existing-folder",
    name: "Existing",
    slug: "existing",
    children: [],
  };
  pages.folders.set(ROOT_FOLDER_ID, {
    ...rootFolder,
    children: [...rootFolder.children, existingFolder.id],
  });
  pages.folders.set(existingFolder.id, existingFolder);

  expect(
    validateFolderSettings({
      pages,
      values: {
        name: "New",
        slug: "existing",
        parentFolderId: ROOT_FOLDER_ID,
      },
    })
  ).toEqual({ slug: ['Slug "existing" is already in use'] });

  expect(
    validateFolderSettings({
      pages,
      folderId: existingFolder.id,
      values: {
        name: "Existing",
        slug: "existing",
        parentFolderId: ROOT_FOLDER_ID,
      },
    })
  ).toEqual({});

  expect(
    validateFolderSettings({
      pages,
      values: {
        name: "",
        slug: "Invalid Slug",
        parentFolderId: ROOT_FOLDER_ID,
      },
    })
  ).toMatchObject({
    name: expect.arrayContaining([expect.any(String)]),
    slug: expect.arrayContaining([expect.any(String)]),
  });
});

test("validates page general settings inputs", () => {
  expect(
    pageGeneralSettingsInput.parse({
      name: "Pricing",
      path: "/pricing",
      status: 200,
      redirect: "",
      documentType: "html",
    })
  ).toEqual({
    name: "Pricing",
    path: "/pricing",
    status: 200,
    redirect: "",
    documentType: "html",
  });
  const invalidStatus = pageGeneralSettingsInput.safeParse({
    name: "Pricing",
    path: "/pricing",
    status: 999,
  });
  expect(invalidStatus.success).toBe(false);
  if (invalidStatus.success === false) {
    expect(getZodValidationIssues(invalidStatus.error)).toEqual([
      expect.objectContaining({
        code: "invalid_page_status",
        path: ["status"],
        constraint: "http_status:200-599",
        example: 200,
      }),
    ]);
  }
  expect(
    pageGeneralSettingsInput.safeParse({
      name: "Pricing",
      path: "/",
    }).success
  ).toBe(false);
  expect(
    homePageGeneralSettingsInput.parse({
      name: "Home",
      path: "",
    })
  ).toEqual({
    name: "Home",
    path: "",
  });
});

test("validates page search settings inputs", () => {
  expect(
    pageSearchSettingsInput.parse({
      title: "Docs",
      description: "Documentation",
      excludePageFromSearch: false,
      language: "en-US",
    })
  ).toEqual({
    title: "Docs",
    description: "Documentation",
    excludePageFromSearch: false,
    language: "en-US",
  });
  expect(
    pageSearchSettingsInput.parse({ title: "Docs", language: "" })
  ).toEqual({
    title: "Docs",
    language: "",
  });
  expect(
    pageSearchSettingsInput.safeParse({ title: "D", language: "en-US" }).success
  ).toBe(false);
  const invalidLanguage = pageSearchSettingsInput.safeParse({
    title: "Docs",
    language: "not locale",
  });
  expect(invalidLanguage.success).toBe(false);
  if (invalidLanguage.success === false) {
    expect(getZodValidationIssues(invalidLanguage.error)).toEqual([
      expect.objectContaining({
        code: "invalid_page_language",
        path: ["language"],
        constraint: "bcp_47_language_tag",
        example: "en-US",
      }),
    ]);
  }
});

test("validates page template settings inputs", () => {
  expect(
    pageTemplateSettingsInput.parse({
      name: "Landing Page",
      title: "Landing Page",
    })
  ).toEqual({
    name: "Landing Page",
    title: "Landing Page",
  });
  expect(
    pageTemplateSettingsInput.safeParse({
      name: "",
      title: "Landing Page",
    }).success
  ).toBe(false);
  expect(
    pageTemplateSettingsInput.safeParse({
      name: "Landing Page",
      title: "L",
    }).success
  ).toBe(false);
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
  test("resolves exact page paths before catch-all paths", () => {
    const pages = migratePages({
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
          id: "pricing",
          name: "Pricing",
          path: "/pricing",
          title: `"Pricing"`,
          meta: {},
          rootInstanceId: "pricingBody",
        },
        {
          id: "not-found",
          name: "404",
          path: "/*",
          title: `"404"`,
          meta: { status: "404" },
          rootInstanceId: "notFoundBody",
        },
      ],
      folders: [createRootFolder(["home", "pricing", "not-found"])],
    });
    const serializedPages = getSerializedPages({ pages });

    expect(
      findSerializedPageByInput(serializedPages, {
        pagePath: "/pricing",
      })?.id
    ).toBe("pricing");
    expect(
      findSerializedPageByInput(serializedPages, {
        pagePath: "/missing",
      })?.id
    ).toBe("not-found");
    expect(getPageByPath({ pages }, { path: "/pricing" })).toMatchObject({
      id: "pricing",
      requestedPath: "/pricing",
      found: true,
      exactMatch: true,
      matchedPattern: false,
      matchedFallback: false,
    });
    expect(getPageByPath({ pages }, { path: "/missing" })).toMatchObject({
      requestedPath: "/missing",
      found: false,
      exactMatch: false,
      matchedPattern: true,
      matchedFallback: true,
      fallbackPage: {
        id: "not-found",
        path: "/*",
        meta: {
          status: "404",
        },
      },
      guidance: expect.stringContaining("No exact page exists"),
    });
  });

  test("resolves dynamic page patterns by requested path", () => {
    const pages = migratePages({
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
          id: "post",
          name: "Post",
          path: "/blog/:slug",
          title: `"Post"`,
          meta: {},
          rootInstanceId: "postBody",
        },
      ],
      folders: [createRootFolder(["home", "post"])],
    });
    const serializedPages = getSerializedPages({ pages });

    expect(
      findSerializedPageByInput(serializedPages, {
        pagePath: "/blog/first-post",
      })?.id
    ).toBe("post");
    expect(
      findSerializedPageByInput(serializedPages, {
        pagePath: "/blog/first-post/comments",
      })
    ).toBeUndefined();
    expect(
      getPageByPath({ pages }, { path: "/blog/first-post" })
    ).toMatchObject({
      id: "post",
      requestedPath: "/blog/first-post",
      found: true,
      exactMatch: false,
      matchedPattern: true,
      matchedFallback: false,
    });
  });

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

  test("reject empty page names and invalid document types", () => {
    expect(() => pageFieldsInput.parse({ name: "" })).toThrow();
    expect(() => pageMetaInput.parse({ documentType: "json" })).toThrow();
  });

  test("accepts fixed numeric and dynamic expression status codes", () => {
    expect(pageFieldsInput.parse({ meta: { status: 302 } })).toEqual({
      meta: { status: "302" },
    });
    expect(pageFieldsInput.parse({ meta: { status: "302" } })).toEqual({
      meta: { status: "302" },
    });
    expect(
      pageFieldsInput.parse({ meta: { status: "system.status" } }).meta?.status
    ).toBe("system.status");
    expect(pageFieldsInput.safeParse({ meta: { status: 199 } }).success).toBe(
      false
    );
    expect(pageFieldsInput.safeParse({ meta: { status: 600 } }).success).toBe(
      false
    );
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
      expect.stringMatching(/^title: .*Plain fixed text is accepted/),
      expect.stringMatching(
        /^meta.description: .*Plain fixed text is accepted/
      ),
      expect.stringMatching(
        /^meta.custom.0.content: .*Plain fixed text is accepted/
      ),
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

  test("uses add when replacing custom metadata", () => {
    const pages = createPages();
    const page = pages.pages.get("page")!;
    page.meta.custom = [{ property: "og:title", content: '"Previous"' }];

    expect(
      createPageUpdatePatches({
        input: {
          meta: {
            custom: [{ property: "og:title", content: '"Updated"' }],
          },
        },
        page,
        pages,
      })
    ).toEqual([
      {
        op: "add",
        path: ["pages", "page", "meta", "custom"],
        value: [{ property: "og:title", content: '"Updated"' }],
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

  test("plans same-folder reorder", () => {
    const { pages, f, p, register } = createRuntimePages();
    const page = p("page", "/page");
    const nextPage = p("next", "/next");
    register([f("folder", [page, nextPage])]);

    expect(
      getOrderedFolderChildReparentPlan(pages.folders, page.id, "folder", 2)
    ).toEqual({
      currentFolderId: "folder",
      currentIndex: 0,
      nextFolderId: "folder",
      nextIndex: 1,
    });
  });

  test("moves page tree item at explicit position", () => {
    const { pages, f, p, register } = createRuntimePages();
    const page = p("page", "/page");
    const first = p("first", "/first");
    register([f("source", [page]), f("target", [first])]);

    const result = movePageTreeItem(
      { pages },
      { childId: page.id, parentFolderId: "target", position: 0 }
    );

    expect(result.payload).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "remove",
            path: ["folders", "source", "children", 0],
          },
          {
            op: "add",
            path: ["folders", "target", "children", 0],
            value: page.id,
          },
        ],
      },
    ]);
  });

  test("rejects moving folders into descendants", () => {
    const { pages, f, register } = createRuntimePages();
    register([f("folder", [f("child")])]);

    expect(() =>
      movePageTreeItem(
        { pages },
        { childId: "folder", parentFolderId: "child", position: 0 }
      )
    ).toThrow("Folder cannot be moved into itself or a descendant");
  });

  test("reparents orphaned pages and folders to the root", () => {
    const { pages, f, p, register } = createRuntimePages();
    const page = p("page", "/page");
    const orphanPage = p("orphan", "/orphan");
    register([page]);
    pages.pages.set(orphanPage.id, orphanPage);
    pages.folders.set("orphan-folder", f("orphan-folder"));

    reparentOrphansMutable(pages);

    expect(pages.folders.get(pages.rootFolderId)?.children).toEqual([
      "homePageId",
      "orphan-folder",
      "page",
      "orphan",
    ]);
  });

  test("runtime orphan repair emits pages replacement payload", () => {
    const { pages, p } = createRuntimePages();
    pages.pages.set("orphan", p("orphan", "/orphan"));

    const result = reparentOrphans({ pages });

    expect(result.payload).toEqual([
      {
        namespace: "pages",
        patches: [{ op: "replace", path: [], value: expect.any(Object) }],
      },
    ]);
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

  test("draft pages continue to reserve their path", () => {
    const page = pages.pages.get("page2")!;
    page.isDraft = true;
    expect(
      isPathAvailable({ pages, path: "/page", parentFolderId: "folder2" })
    ).toBe(false);
    delete page.isDraft;
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

describe("createPage", () => {
  test("requires non-home create paths to start with slash", () => {
    const result = pageCreateInput.safeParse({
      name: "Healthcare Operations Design System",
      path: "healthcare-operations-design-system",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["path"],
          message: "Must start with a / or a full URL e.g. https://website.org",
        }),
      ])
    );
  });

  test("explains expression-backed title must be a string, not a prop object", () => {
    const result = pageCreateInput.safeParse({
      name: "Healthcare Operations Design System",
      path: "/healthcare-operations-design-system",
      title: {
        type: "string",
        value: "Healthcare Operations Design System",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["title"],
          message: expect.stringContaining(
            'Pass it as a string, not as a prop value object like {"type":"string","value":"..."}'
          ),
        }),
      ])
    );
  });

  test("rejects page paths with unsupported URL pattern syntax", () => {
    expect(() =>
      createPage(
        { pages: createPages() },
        {
          name: "Broken Pattern",
          path: "/prefix-:id",
        },
        { createId: createIdFactory() }
      )
    ).toThrow("Static parts cannot be mixed with dynamic parameters");
  });

  test("accepts fixed page metadata text and stores expression string literals", () => {
    const pages = createPages();
    const mutation = createPage(
      { pages },
      {
        name: "Atlas Ops Design System",
        path: "/atlas-ops-design-system",
        title: "Atlas Ops Design System",
        meta: {
          description: "Reusable interface examples for operations teams.",
          socialImageUrl: "https://assets.example.com/atlas-og.png",
          custom: [{ property: "og:title", content: "Atlas Ops" }],
        },
      },
      { createId: createIdFactory() }
    );

    expect(mutation.result).toEqual({
      pageId: "page-id",
      rootInstanceId: "root-instance-id",
    });
    expect(mutation.payload).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "add",
            path: ["pages", "page-id"],
            value: expect.objectContaining({
              id: "page-id",
              name: "Atlas Ops Design System",
              path: "/atlas-ops-design-system",
              title: `"Atlas Ops Design System"`,
              meta: expect.objectContaining({
                description: `"Reusable interface examples for operations teams."`,
                socialImageUrl: `"https://assets.example.com/atlas-og.png"`,
                custom: [{ property: "og:title", content: `"Atlas Ops"` }],
              }),
              rootInstanceId: "root-instance-id",
            }),
          },
          {
            op: "add",
            path: ["folders", "root", "children", 3],
            value: "page-id",
          },
        ],
      },
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["root-instance-id"],
            value: createPageRootInstance("root-instance-id"),
          },
        ],
      },
    ]);
  });

  test("still rejects invalid JavaScript-looking page metadata expressions", () => {
    const pages = createPages();

    expect(() =>
      createPage(
        { pages },
        {
          name: "Broken",
          path: "/broken",
          title: "pageTitle ??",
        },
        { createId: createIdFactory() }
      )
    ).toThrow(/title: .*Plain fixed text is accepted/);
  });
});

describe("updatePage", () => {
  test("sets and clears draft", () => {
    const pages = createPages();

    expect(
      updatePage({ pages }, { pageId: "page", values: { isDraft: true } })
        .payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "add",
            path: ["pages", "page", "isDraft"],
            value: true,
          },
        ],
      },
    ]);

    pages.pages.get("page")!.isDraft = true;
    expect(
      updatePage({ pages }, { pageId: "page", values: { isDraft: true } })
        .payload
    ).toEqual([]);
    expect(
      updatePage({ pages }, { pageId: "page", values: { isDraft: false } })
        .payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [{ op: "remove", path: ["pages", "page", "isDraft"] }],
      },
    ]);
  });

  test("rejects drafting home and catch-all pages", () => {
    const pages = createPages();
    expect(() =>
      updatePage({ pages }, { pageId: "home", values: { isDraft: true } })
    ).toThrow("Home page can't be draft");

    pages.pages.get("page")!.path = "/*";
    expect(() =>
      updatePage({ pages }, { pageId: "page", values: { isDraft: true } })
    ).toThrow("Catch-all 404 page can't be draft");
  });

  test("rejects changing a draft page to the catch-all path", () => {
    const pages = createPages();
    pages.pages.get("page")!.isDraft = true;

    expect(() =>
      updatePage({ pages }, { pageId: "page", values: { path: "/*" } })
    ).toThrow("Catch-all 404 page can't be draft");
  });

  test("accepts fixed page metadata text and stores expression string literals", () => {
    const pages = createPages();

    expect(
      updatePage(
        { pages },
        {
          pageId: "page",
          values: {
            title: "Pricing Plans",
            meta: {
              description: "Plans for teams.",
              socialImageUrl: "https://assets.example.com/pricing-og.png",
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
            value: `"Plans for teams."`,
          },
          {
            op: "add",
            path: ["pages", "page", "meta", "socialImageUrl"],
            value: `"https://assets.example.com/pricing-og.png"`,
          },
        ],
      },
    ]);
  });

  test("rejects invalid JavaScript-looking page metadata expressions before patching", () => {
    const pages = createPages();

    expect(() =>
      updatePage(
        { pages },
        {
          pageId: "page",
          values: {
            title: "pageTitle ??",
          },
        }
      )
    ).toThrow(/title: .*Plain fixed text is accepted/);
  });

  test("rejects updated page paths with unsupported URL pattern syntax", () => {
    expect(() =>
      updatePage(
        { pages: createPages() },
        {
          pageId: "page",
          values: {
            path: "/blog-*",
          },
        }
      )
    ).toThrow("Static parts cannot be mixed with dynamic parameters");
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

describe("updatePageMarketplace", () => {
  test("updates settings, marketplace, and home page in one mutation", () => {
    const pages = createPages();
    const result = updatePageSettings(
      { pages },
      {
        pageId: "page",
        values: {
          title: "Landing",
          description: "Welcome",
          marketplace: {
            include: true,
            category: "Marketing",
            thumbnailAssetId: "asset-id",
          },
          isHomePage: true,
        },
      }
    );

    expect(result.result).toEqual({ pageId: "page" });
    expect(result.invalidatesNamespaces).toEqual(["pages"]);
    expect(result.payload.flatMap((change) => change.patches)).toEqual(
      expect.arrayContaining([
        {
          op: "replace",
          path: ["pages", "page", "title"],
          value: `"Landing"`,
        },
        {
          op: "add",
          path: ["pages", "page", "meta", "description"],
          value: `"Welcome"`,
        },
        {
          op: "add",
          path: ["pages", "page", "marketplace"],
          value: {
            include: true,
            category: "Marketing",
            thumbnailAssetId: "asset-id",
          },
        },
        { op: "replace", path: ["homePageId"], value: "page" },
      ])
    );
  });

  test("normalizes empty optional marketplace fields", () => {
    const pages = createPages();

    expect(
      updatePageMarketplace(
        { pages },
        {
          pageId: "page",
          marketplace: {
            include: true,
            category: "",
            thumbnailAssetId: "",
          },
        }
      ).payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "add",
            path: ["pages", "page", "marketplace"],
            value: {
              include: true,
              category: undefined,
              thumbnailAssetId: undefined,
            },
          },
        ],
      },
    ]);
  });

  test("adds marketplace fields missing from serialized page data", () => {
    const pages = createPages();
    const page = pages.pages.get("page");
    page!.marketplace = {
      include: true,
      category: "",
      thumbnailAssetId: "",
    };

    expect(
      updatePageMarketplace(
        { pages },
        {
          pageId: "page",
          marketplace: {
            include: true,
            category: "Runtime Examples",
            thumbnailAssetId: "",
          },
        }
      ).payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "add",
            path: ["pages", "page", "marketplace", "category"],
            value: "Runtime Examples",
          },
        ],
      },
    ]);
  });

  test("removes cleared optional marketplace fields", () => {
    const pages = createPages();
    const page = pages.pages.get("page");
    page!.marketplace = {
      include: true,
      category: "Runtime Examples",
      thumbnailAssetId: "asset-id",
    };

    expect(
      updatePageMarketplace(
        { pages },
        {
          pageId: "page",
          marketplace: {
            include: true,
            category: "",
            thumbnailAssetId: "",
          },
        }
      ).payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "remove",
            path: ["pages", "page", "marketplace", "category"],
          },
          {
            op: "remove",
            path: ["pages", "page", "marketplace", "thumbnailAssetId"],
          },
        ],
      },
    ]);
  });
});

describe("savePagePathInHistory", () => {
  test("adds latest path first and removes duplicates", () => {
    const pages = createPages();
    const page = pages.pages.get("page");
    page!.history = ["/old", "/dynamic/1"];

    expect(
      savePagePathInHistory(
        { pages },
        {
          pageId: "page",
          path: "/dynamic/1",
        }
      ).payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["pages", "page", "history"],
            value: ["/dynamic/1", "/old"],
          },
        ],
      },
    ]);
  });

  test("falls back to page path and caps history", () => {
    const pages = createPages();
    const page = pages.pages.get("page");
    page!.history = Array.from({ length: 20 }, (_, index) => `/old-${index}`);

    expect(
      savePagePathInHistory(
        { pages },
        {
          pageId: "page",
          path: "",
        }
      ).payload
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["pages", "page", "history"],
            value: ["/page", ...page!.history.slice(0, 19)],
          },
        ],
      },
    ]);
  });

  test("returns empty payload when latest path is already stored", () => {
    const pages = createPages();
    const page = pages.pages.get("page");
    page!.history = ["/dynamic/1", "/old"];

    expect(
      savePagePathInHistory(
        { pages },
        {
          pageId: "page",
          path: "/dynamic/1",
        }
      ).payload
    ).toEqual([]);
  });

  test("rejects missing page", () => {
    const pages = createPages();

    expect(() =>
      savePagePathInHistory(
        { pages },
        {
          pageId: "missing",
          path: "/dynamic/1",
        }
      )
    ).toThrow("Page not found");
  });
});

describe("setHomePage", () => {
  test("rejects setting a draft page as home", () => {
    const pages = createPages();
    pages.pages.get("page")!.isDraft = true;

    expect(() => setHomePage({ pages }, { pageId: "page" })).toThrow(
      "Home page can't be draft"
    );
  });

  test("sets home page and keeps a single root folder reference", () => {
    const pages = createPages();
    const rootFolder = pages.folders.get(ROOT_FOLDER_ID);
    rootFolder?.children.push("page");

    expect(setHomePage({ pages }, { pageId: "page" }).payload).toEqual([
      {
        namespace: "pages",
        patches: [
          { op: "replace", path: ["homePageId"], value: "page" },
          { op: "replace", path: ["pages", "page", "path"], value: "" },
          { op: "replace", path: ["pages", "page", "name"], value: "Home" },
          {
            op: "replace",
            path: ["pages", "home", "name"],
            value: "Old Home",
          },
          {
            op: "replace",
            path: ["pages", "home", "path"],
            value: "/old-home",
          },
          {
            op: "replace",
            path: ["folders", ROOT_FOLDER_ID, "children"],
            value: ["page", "home", "folder"],
          },
        ],
      },
    ]);
  });

  test("does not mutate current home page", () => {
    const result = setHomePage({ pages: createPages() }, { pageId: "home" });

    expect(result.noop).toEqual(true);
    expect(result.payload).toEqual([]);
  });
});

describe("nameToPath", () => {
  test("uses a numeric suffix when slug path is already used", () => {
    const pages = createPages();

    expect(nameToPath(pages, "Page")).toEqual("/page1");
  });
});

const createPageSettingsValues = (
  values: Partial<PageSettingsValues> = {}
): PageSettingsValues => ({
  ...pageSettingsDefaultValues,
  auth: { ...pageSettingsDefaultValues.auth },
  customMetas: [...pageSettingsDefaultValues.customMetas],
  marketplace: { ...pageSettingsDefaultValues.marketplace },
  ...values,
});

describe("page settings validation", () => {
  test("computes page settings path from parent folder and home page state", () => {
    const pages = createPages();
    expect(
      computePageSettingsPath(
        createPageSettingsValues({ isHomePage: true }),
        pages
      )
    ).toBe("/");
    expect(
      computePageSettingsPath(
        createPageSettingsValues({
          parentFolderId: "folder",
          path: "/post",
        }),
        pages
      )
    ).toBe("/folder/post");
  });

  test("accumulates duplicate path errors from the general section", () => {
    const pages = createPages();
    const errors = validatePageSettings({
      pages,
      pageId: undefined,
      values: createPageSettingsValues({ path: "/page" }),
      variableValues: new Map(),
    });

    expect(errors.path).toEqual(["All paths must be unique"]);
  });

  test("accumulates auth errors with other field errors", () => {
    const errors = validatePageSettings({
      pages: createPages(),
      pageId: undefined,
      values: createPageSettingsValues({
        path: "missing-leading-slash",
        auth: {
          login: "admin:root",
          password: "secret phrase",
        },
      }),
      variableValues: new Map(),
    });

    expect(errors.path).toEqual(
      expect.arrayContaining([
        "Must start with a / or a full URL e.g. https://website.org",
      ])
    );
    expect(errors.auth).toEqual({
      login: ["Login can't contain a colon"],
      password: ["Password can't contain whitespace"],
    });
  });

  test("does not require auth when both credentials are empty", () => {
    expect(
      validatePageSettings({
        pages: createPages(),
        pageId: undefined,
        values: createPageSettingsValues(),
        variableValues: new Map(),
      }).auth
    ).toBeUndefined();
  });

  test("validates only visible document type sections", () => {
    const invalidHtmlMetadata = {
      title: `""`,
      language: `"not a locale"`,
    };

    const textErrors = validatePageSettings({
      pages: createPages(),
      pageId: undefined,
      values: createPageSettingsValues({
        ...invalidHtmlMetadata,
        documentType: "text",
        content: "42",
      }),
      variableValues: new Map(),
    });

    expect(textErrors.title).toBeUndefined();
    expect(textErrors.language).toBeUndefined();
    expect(textErrors.content).toBeDefined();

    const xmlErrors = validatePageSettings({
      pages: createPages(),
      pageId: undefined,
      values: createPageSettingsValues({
        ...invalidHtmlMetadata,
        documentType: "xml",
        content: "42",
      }),
      variableValues: new Map(),
    });

    expect(xmlErrors.title).toBeUndefined();
    expect(xmlErrors.language).toBeUndefined();
    expect(xmlErrors.content).toBeUndefined();
  });

  test("allows redirect on the home page", () => {
    const errors = validatePageSettings({
      pages: createPages(),
      pageId: "home",
      values: createPageSettingsValues({
        isHomePage: true,
        path: "/",
        redirect: `"/test"`,
      }),
      variableValues: new Map(),
    });

    expect(errors.redirect).toBeUndefined();
  });
});
