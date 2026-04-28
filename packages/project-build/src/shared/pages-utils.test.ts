import { test, expect } from "vitest";
import { createDefaultPages } from "./pages-utils";

test("createDefaultPages", () => {
  expect(
    createDefaultPages({
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemDataSourceId",
      homePageId: "homePageId",
    })
  ).toEqual({
    meta: {},
    homePageId: "homePageId",
    rootFolderId: "root",
    pages: new Map([
      [
        "homePageId",
        {
          id: "homePageId",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "rootInstanceId",
          systemDataSourceId: "systemDataSourceId",
        },
      ],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["homePageId"],
        },
      ],
    ]),
  });
});
