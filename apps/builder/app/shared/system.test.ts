import { describe, expect, test } from "vitest";
import type { Page, Pages } from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { updateCurrentSystem } from "./system";
import { selectPage } from "./nano-states";

registerContainers();

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
