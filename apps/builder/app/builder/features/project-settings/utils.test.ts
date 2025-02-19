import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { getExistingRoutePaths } from "./utils";

describe("getExistingRoutePaths", () => {
  test("gets all the route paths that exists in the project", () => {
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
      title: `"Page"`,
    });

    pages.pages.push({
      id: "blogId",
      meta: {},
      name: "Blog",
      path: "/blog/:id",
      rootInstanceId: "rootInstanceId",
      title: `"Blog"`,
    });

    const result = getExistingRoutePaths(pages);
    expect(Array.from(result)).toEqual(["/page", "/blog/:id"]);
  });
});
