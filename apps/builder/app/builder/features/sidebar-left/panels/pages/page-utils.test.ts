import { describe, expect, test } from "@jest/globals";
import {
  cleanupChildRefsMutable,
  findFolderById,
  findParentFolderByChildId,
  reparentOrphansMutable,
  toTreeData,
} from "./page-utils";
import { createDefaultPages } from "@webstudio-is/project-build";

describe("toTreeData", () => {
  test("initial pages always has home pages and a root folder", () => {
    const pages = createDefaultPages({
      rootInstanceId: "id",
      homePageId: "homePageId",
    });
    const tree = toTreeData(pages);
    expect(tree.root).toEqual({
      id: "root",
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
            title: "Home",
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
      homePageId: "homePageId",
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    pages.rootFolder.children.push("folderId");
    const tree = toTreeData(pages);
    expect(tree.root).toEqual({
      id: "root",
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
            title: "Home",
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
      homePageId: "homePageId",
    });
    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "id",
      title: "Page",
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: ["pageId"],
    });
    pages.rootFolder.children.push("folderId");
    const tree = toTreeData(pages);

    expect(tree.root).toEqual({
      id: "root",
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
            title: "Home",
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
                title: "Page",
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
      homePageId: "homePageId",
    });
    pages.rootFolder.children.push("1");
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
      id: "root",
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
            title: "Home",
            meta: {},
            rootInstanceId: "id",
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
      homePageId: "homePageId",
    });
    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      title: "Page",
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    reparentOrphansMutable(pages);
    expect(pages.rootFolder).toEqual({
      id: "root",
      name: "Root",
      slug: "",
      children: ["homePageId", "folderId", "pageId"],
    });
  });
});

describe("cleanupChildRefsMutable", () => {
  test("cleanup refs", () => {
    const pages = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      homePageId: "homePageId",
    });
    pages.folders.push({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    pages.rootFolder.children.push("folderId");
    cleanupChildRefsMutable("folderId", pages);
    expect(pages.rootFolder).toEqual({
      id: "root",
      name: "Root",
      slug: "",
      children: ["homePageId"],
    });
  });
});

describe("findParentFolderByChildId", () => {
  const pages = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    homePageId: "homePageId",
  });
  pages.folders.push({
    id: "folderId",
    name: "Folder 1",
    slug: "folder",
    children: ["folderId1"],
  });
  pages.rootFolder.children.push("folderId");
  pages.folders.push({
    id: "folderId1",
    name: "Folder 2",
    slug: "folder",
    children: [],
  });
  pages.folders.push({
    id: "folderId2",
    name: "Folder 3",
    slug: "folder",
    children: [],
  });

  test("find in root folder", () => {
    expect(findParentFolderByChildId("folderId", pages)).toEqual(
      pages.rootFolder
    );
  });

  test("orphan folder 3 - return root", () => {
    expect(findParentFolderByChildId("folderId3", pages)).toEqual(
      pages.rootFolder
    );
  });
});

describe("findFolderById", () => {
  const pages = createDefaultPages({
    rootInstanceId: "rootInstanceId",
    homePageId: "homePageId",
  });
  pages.folders.push({
    id: "folderId",
    name: "Folder 1",
    slug: "folder",
    children: ["folderId1"],
  });

  test("find folder", () => {
    expect(findFolderById("folderId", pages)).toEqual({
      id: "folderId",
      name: "Folder 1",
      slug: "folder",
      children: ["folderId1"],
    });
  });

  test("folder not found - root returned", () => {
    expect(findFolderById("unknown", pages)).toEqual(pages.rootFolder);
  });
});
