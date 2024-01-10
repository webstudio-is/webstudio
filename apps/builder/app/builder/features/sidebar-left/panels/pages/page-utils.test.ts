import { expect, test } from "@jest/globals";
import { toTreeData } from "./page-utils";
import { createDefaultPages } from "@webstudio-is/project-build";

test("initial pages always has home pages and a root folder", () => {
  const pages = createDefaultPages({ rootInstanceId: "id" });
  const root = toTreeData(pages);
  expect(root).toEqual({
    id: "root",
    name: "Root",
    slug: "",
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

test("add empty folder", () => {
  const pages = createDefaultPages({ rootInstanceId: "id" });
  pages.folders.push({
    id: "folderId",
    name: "Folder",
    slug: "folder",
    children: [],
  });

  expect(toTreeData(pages)).toEqual({
    id: "root",
    name: "Root",
    slug: "",
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
        slug: "folder",
        children: [],
      },
    ],
  });
});

test("add a page inside a folder", () => {
  const pages = createDefaultPages({ rootInstanceId: "id" });
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
  const tree = toTreeData(pages);

  expect(tree).toEqual({
    id: "root",
    name: "Root",
    slug: "",
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
