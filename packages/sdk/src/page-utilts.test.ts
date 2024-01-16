import { describe, expect, test } from "@jest/globals";
import type { Pages } from "./schema/pages";
import { getPagePath } from "./page-utils";

describe("getPagePath", () => {
  const pages = {
    meta: {},
    homePage: {
      id: "home",
      path: "/",
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
