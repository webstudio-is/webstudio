import { beforeEach, describe, expect, test } from "vitest";
import type { Page, Pages } from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $currentSystem,
  $systemDataByPage,
  updateCurrentSystem,
} from "./system";
import { selectPage } from "./nano-states";

registerContainers();

beforeEach(() => {
  $systemDataByPage.set(new Map());
});

const getInitialPages = (page: Page): Pages => ({
  homePageId: "homeId",
  rootFolderId: "rootId",
  folders: new Map([
    [
      "rootId",
      {
        id: "rootId",
        name: "",
        slug: "",
        children: ["homeId", "dynamicId"],
      },
    ],
  ]),
  pages: new Map([
    [
      "homeId",
      {
        id: "homeId",
        path: "",
        name: "",
        title: "",
        meta: {},
        rootInstanceId: "",
      },
    ],
    [page.id, page],
  ]),
});

const getPagesInBlogFolder = (page: Page): Pages => ({
  ...getInitialPages(page),
  folders: new Map([
    [
      "rootId",
      {
        id: "rootId",
        name: "",
        slug: "",
        children: ["homeId", "folderId"],
      },
    ],
    [
      "folderId",
      {
        id: "folderId",
        name: "Blog",
        slug: "blog",
        children: ["dynamicId"],
      },
    ],
  ]),
});

describe("history", () => {
  test("add new path at the start", () => {
    $pages.set(
      getInitialPages({
        id: "dynamicId",
        path: "/blog/:date/post/:slug",
        name: "",
        title: "",
        meta: {},
        rootInstanceId: "",
      })
    );
    selectPage("dynamicId");
    updateCurrentSystem({
      params: { date: "my-date", slug: "my-slug" },
    });
    expect($pages.get()?.pages.get("dynamicId")?.history).toEqual([
      "/blog/my-date/post/my-slug",
    ]);
    updateCurrentSystem({
      params: { date: "another-date", slug: "another-slug" },
    });
    expect($pages.get()?.pages.get("dynamicId")?.history).toEqual([
      "/blog/another-date/post/another-slug",
      "/blog/my-date/post/my-slug",
    ]);
  });

  test("move existing path to the start", () => {
    $pages.set(
      getInitialPages({
        id: "dynamicId",
        path: "/blog/:date/post/:slug",
        name: "",
        title: "",
        meta: {},
        rootInstanceId: "",
        history: [
          "/blog/another-date/post/another-slug",
          "/blog/my-date/post/my-slug",
        ],
      })
    );
    selectPage("dynamicId");
    updateCurrentSystem({
      params: { date: "my-date", slug: "my-slug" },
    });
    expect($pages.get()?.pages.get("dynamicId")?.history).toEqual([
      "/blog/my-date/post/my-slug",
      "/blog/another-date/post/another-slug",
    ]);
  });
});

test("system pathname includes parent folder slug", () => {
  $pages.set(
    getPagesInBlogFolder({
      id: "dynamicId",
      path: "/post/:slug",
      name: "",
      title: "",
      meta: {},
      rootInstanceId: "",
    })
  );
  selectPage("dynamicId");

  updateCurrentSystem({
    params: { slug: "my-post" },
  });

  expect($currentSystem.get().pathname).toBe("/blog/post/my-post");
  expect($pages.get()?.pages.get("dynamicId")?.history).toEqual([
    "/blog/post/my-post",
  ]);
});

test("system query bindings keep every value and scalar compatibility", () => {
  $pages.set(
    getInitialPages({
      id: "dynamicId",
      path: "/products/:slug",
      name: "Product",
      title: "Product",
      meta: {},
      rootInstanceId: "",
    })
  );
  selectPage("dynamicId");
  updateCurrentSystem({
    params: { slug: "chair" },
    search: { tag: "blue" },
    searchAll: { tag: ["red", "blue"] },
  });
  expect($currentSystem.get()).toMatchObject({
    params: { slug: "chair" },
    search: { tag: "blue" },
    searchAll: { tag: ["red", "blue"] },
  });
  updateCurrentSystem({ search: { tag: "green" } });
  expect($currentSystem.get().searchAll?.tag).toEqual(["green"]);
});

test("system params support legacy history without parent folder slug", () => {
  $pages.set(
    getPagesInBlogFolder({
      id: "dynamicId",
      path: "/post/:slug",
      name: "",
      title: "",
      meta: {},
      rootInstanceId: "",
      history: ["/post/my-post"],
    })
  );
  selectPage("dynamicId");

  expect($currentSystem.get()).toMatchObject({
    params: { slug: "my-post" },
    pathname: "/blog/post/my-post",
  });
});

test("system params decode history paths with an encoded folder slug", () => {
  $pages.set(
    getPagesInBlogFolder({
      id: "dynamicId",
      path: "/post/:slug",
      name: "",
      title: "",
      meta: {},
      rootInstanceId: "",
      history: ["/%62log/post/caf%C3%A9"],
    })
  );
  selectPage("dynamicId");

  expect($currentSystem.get().params).toEqual({ slug: "café" });
});
