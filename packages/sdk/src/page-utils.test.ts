import { describe, expect, test } from "vitest";
import type { Pages } from "./schema/pages";
import {
  findPageByIdOrPath,
  findParentFolderByChildId,
  getPagePath,
} from "./page-utils";

const pages = {
  meta: {},
  homePage: {
    id: "home",
    path: "",
    name: "Home",
    title: "Home",
    rootInstanceId: "rootInstanceId",
    meta: {},
  },
  pages: [
    {
      id: "page-1",
      path: "/page-1",
      name: "Page",
      title: "Page",
      rootInstanceId: "rootInstanceId",
      meta: {},
    },
  ],
  folders: [
    {
      id: "root",
      name: "Root",
      slug: "",
      children: ["folderId-1"],
    },
    {
      id: "folderId-1",
      name: "Folder 1",
      slug: "folder-1",
      children: ["folderId-1-1"],
    },
    {
      id: "folderId-1-1",
      name: "Folder 1-1",
      slug: "folder-1-1",
      children: ["folderId-1-1-1"],
    },
    {
      id: "folderId-1-1-1",
      name: "Folder 1-1-1",
      slug: "folder-1-1-1",
      children: ["page-1"],
    },
  ],
} satisfies Pages;

describe("getPagePath", () => {
  test("home page path", () => {
    expect(getPagePath("home", pages)).toEqual("");
  });

  test("nesting level 0", () => {
    expect(getPagePath("root", pages)).toEqual("");
  });

  test("nesting level 1", () => {
    expect(getPagePath("folderId-1", pages)).toEqual("/folder-1");
  });

  test("nesting level 2", () => {
    expect(getPagePath("folderId-1-1", pages)).toEqual("/folder-1/folder-1-1");
  });

  test("nesting level 3", () => {
    expect(getPagePath("folderId-1-1-1", pages)).toEqual(
      "/folder-1/folder-1-1/folder-1-1-1"
    );
  });

  test("page inside folder nesting level 3", () => {
    expect(getPagePath("page-1", pages)).toEqual(
      "/folder-1/folder-1-1/folder-1-1-1/page-1"
    );
  });
});

describe("findPageByIdOrPath", () => {
  test("home page by id", () => {
    const page = findPageByIdOrPath("home", pages);
    expect(page).toEqual(pages.homePage);
  });
  test("home page by path /", () => {
    const page = findPageByIdOrPath("/", pages);
    expect(page).toEqual(pages.homePage);
  });
  test("home page by empty path", () => {
    const page = findPageByIdOrPath("", pages);
    expect(page).toEqual(pages.homePage);
  });
  test("find page by id", () => {
    const page = findPageByIdOrPath("page-1", pages);
    expect(page).toEqual(pages.pages[0]);
  });
  test("find page by nested path", () => {
    const page = findPageByIdOrPath(
      "/folder-1/folder-1-1/folder-1-1-1/page-1",
      pages
    );
    expect(page).toEqual(pages.pages[0]);
  });
});

describe("findParentFolderByChildId", () => {
  test("find in root folder", () => {
    expect(
      findParentFolderByChildId("folderId-1-1-1", pages.folders)?.id
    ).toEqual("folderId-1-1");
  });
});
