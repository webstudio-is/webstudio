import { describe, expect, test } from "@jest/globals";
import type { Page, Pages } from "@webstudio-is/sdk";
import { $pages } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { savePathInHistory } from "./pages";

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
    systemDataSourceId: "",
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
        systemDataSourceId: "",
      })
    );
    savePathInHistory("dynamicId", "/path1");
    expect($pages.get()?.pages[0].history).toEqual(["/path1"]);
    savePathInHistory("dynamicId", "/path2");
    expect($pages.get()?.pages[0].history).toEqual(["/path2", "/path1"]);
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
        systemDataSourceId: "",
        history: ["/path2", "/path1"],
      })
    );
    savePathInHistory("dynamicId", "/path1");
    expect($pages.get()?.pages[0].history).toEqual(["/path1", "/path2"]);
  });
});
