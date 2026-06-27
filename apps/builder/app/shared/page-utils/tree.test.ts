import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  isRootFolder,
  ROOT_FOLDER_ID,
  type Folder,
  type Page,
} from "@webstudio-is/sdk";
import {
  cleanupChildRefsMutable,
  insertFolderMutable,
  registerFolderChildMutable,
  reparentOrphansMutable,
  reparentPageOrFolderMutable,
  updateFolderFieldsMutable,
} from "./tree";

const createPages = () => {
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

describe("folder creation helpers", () => {
  test("creates and inserts folder into requested parent", () => {
    const { pages } = createPages();
    const folder: Folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };

    insertFolderMutable({ pages, folder, parentFolderId: ROOT_FOLDER_ID });

    expect(pages.folders.get("folderId")).toEqual({
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    expect(pages.folders.get(ROOT_FOLDER_ID)?.children).toEqual([
      "homePageId",
      "folderId",
    ]);
  });

  test("falls back to root folder when inserting into missing parent", () => {
    const { pages } = createPages();
    const folder: Folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };

    insertFolderMutable({ pages, folder, parentFolderId: "missing" });

    expect(pages.folders.get(ROOT_FOLDER_ID)?.children).toEqual([
      "homePageId",
      "folderId",
    ]);
  });
});

describe("updateFolderFieldsMutable", () => {
  test("updates folder fields and moves folder", () => {
    const { pages } = createPages();
    const folder = {
      id: "folderId",
      name: "Folder",
      slug: "folder",
      children: [],
    };
    const target = {
      id: "targetId",
      name: "Target",
      slug: "target",
      children: [],
    };
    pages.folders.set(folder.id, folder);
    pages.folders.set(target.id, target);
    registerFolderChildMutable(pages, folder.id, ROOT_FOLDER_ID);
    registerFolderChildMutable(pages, target.id, ROOT_FOLDER_ID);

    updateFolderFieldsMutable({
      folder,
      folderId: folder.id,
      pages,
      values: {
        name: "Updated",
        slug: "updated",
        parentFolderId: target.id,
      },
    });

    expect(folder).toMatchObject({ name: "Updated", slug: "updated" });
    expect(pages.folders.get(ROOT_FOLDER_ID)?.children).toEqual([
      "homePageId",
      "targetId",
    ]);
    expect(target.children).toEqual(["folderId"]);
  });

  test("does not update root folder", () => {
    const { pages } = createPages();
    const root = pages.folders.get(ROOT_FOLDER_ID);

    updateFolderFieldsMutable({
      folder: root!,
      folderId: ROOT_FOLDER_ID,
      pages,
      values: { name: "Updated", slug: "updated" },
    });

    expect(root).toMatchObject({ name: "Root", slug: "" });
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
