import { describe, expect, test } from "vitest";
import type { Page, Pages } from "@webstudio-is/sdk";
import { $pages } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { updateCurrentSystem } from "./system";
import { selectPage } from "./awareness";

registerContainers();

const getInitialPages = (page: Page): Pages => ({
  folders: [
    {
      id: "rootId",
      name: "",
      slug: "",
      children: ["homeId", "dynamicId"],
    },
  ],
  homePage: {
    id: "homeId",
    path: "",
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "",
  },
  pages: [page],
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
    expect($pages.get()?.pages[0].history).toEqual([
      "/blog/my-date/post/my-slug",
    ]);
    updateCurrentSystem({
      params: { date: "another-date", slug: "another-slug" },
    });
    expect($pages.get()?.pages[0].history).toEqual([
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
    expect($pages.get()?.pages[0].history).toEqual([
      "/blog/my-date/post/my-slug",
      "/blog/another-date/post/another-slug",
    ]);
  });
});
