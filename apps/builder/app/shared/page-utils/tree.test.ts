import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { elementComponent } from "@webstudio-is/sdk";
import {
  createFolderCreatePayload,
  createFolderDeletePayload,
  createFolderUpdatePayload,
  createFolderValue,
  createPageDeletePayload,
  findParentFolderId,
  findFolder,
  findPage,
  findSerializedPageByInput,
  getHomePageRootInstanceId,
  getSerializedPagePath,
  getSerializedPages,
  serializePageDetailsByInput,
  serializePageDetails,
  serializePageSummary,
} from "./tree";

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
      socialImageUrl: undefined,
      socialImageAssetId: undefined,
      excludePageFromSearch: true,
      documentType: "html",
      content: undefined,
      custom: undefined,
    });
    expect(getHomePageRootInstanceId(pages)).toBe("root");
    expect(
      findSerializedPageByInput(serializedPages, { pagePath: "" })?.id
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

    expect(
      createPageDeletePayload({
        build: {
          pages,
          instances: [
            {
              type: "instance",
              id: "page-root",
              component: elementComponent,
              children: [{ type: "id", value: "child" }],
            },
            {
              type: "instance",
              id: "child",
              component: elementComponent,
              children: [],
            },
          ],
          props: [],
          dataSources: [],
          styleSources: [],
          styleSourceSelections: [],
          styles: [],
        },
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

    const result = createFolderDeletePayload({
      build: {
        pages,
        instances: [
          {
            type: "instance",
            id: "page-root",
            component: elementComponent,
            children: [{ type: "id", value: "child" }],
          },
          {
            type: "instance",
            id: "child",
            component: elementComponent,
            children: [],
          },
        ],
        props: [],
        dataSources: [],
        styleSources: [],
        styleSourceSelections: [],
        styles: [],
      },
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
