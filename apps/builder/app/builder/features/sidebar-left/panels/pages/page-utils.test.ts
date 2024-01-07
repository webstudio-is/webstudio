import { expect, test } from "@jest/globals";
import { toTreeData } from "./page-utils";
import type { Folder, Pages } from "@webstudio-is/sdk";

const toFoldersMap = (folders: Array<Folder> = []) =>
  new Map(folders.map((folder) => [folder.id, folder]));

const homePage = {
  id: "root",
  name: "Home",
  title: "Home",
  meta: {},
  rootInstanceId: "id",
  path: "/",
};

test("root folder always exists", () => {
  const folders = toFoldersMap();
  const pages: Pages = {
    homePage,
    pages: [],
  };
  const root = toTreeData(folders, pages);
  expect(root.id).toBe("root");
  expect(root.type).toBe("folder");
});

test("home page always exists", () => {
  const folders = toFoldersMap();
  const pages: Pages = {
    homePage,
    pages: [],
  };
  const root = toTreeData(folders, pages);
  expect(root).toEqual({
    id: "root",
    name: "Root",
    path: "",
    type: "folder",
    children: [
      {
        data: {
          id: "root",
          meta: {},
          name: "Home",
          path: "/",
          rootInstanceId: "id",
          title: "Home",
        },
        id: "root",
        type: "page",
      },
    ],
  });
});

test("with empty folder", () => {
  const folders = toFoldersMap([
    {
      id: "folderId",
      name: "Folder",
      path: "/folder",
      children: [],
    },
  ]);

  const pages: Pages = {
    homePage,
    pages: [],
  };

  expect(toTreeData(folders, pages)).toEqual({
    id: "root",
    name: "Root",
    path: "",
    type: "folder",
    children: [
      {
        data: {
          id: "root",
          meta: {},
          name: "Home",
          path: "/",
          rootInstanceId: "id",
          title: "Home",
        },
        id: "root",
        type: "page",
      },
      {
        type: "folder",
        id: "folderId",
        name: "Folder",
        path: "/folder",
        children: [],
      },
    ],
  });
});

test("with page inside a folder", () => {
  const folders = toFoldersMap([
    {
      id: "folderId",
      name: "Folder",
      path: "/folder",
      children: ["pageId"],
    },
  ]);

  const pages: Pages = {
    homePage,
    pages: [
      {
        id: "pageId",
        meta: {},
        name: "Page",
        path: "/page",
        rootInstanceId: "id",
        title: "Page",
      },
    ],
  };
  const tree = toTreeData(folders, pages);

  expect(tree).toEqual({
    id: "root",
    name: "Root",
    path: "",
    type: "folder",
    children: [
      {
        data: {
          id: "root",
          meta: {},
          name: "Home",
          path: "/",
          rootInstanceId: "id",
          title: "Home",
        },
        id: "root",
        type: "page",
      },
      {
        type: "folder",
        id: "folderId",
        name: "Folder",
        path: "/folder",
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
