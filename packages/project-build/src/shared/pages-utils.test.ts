import { test, expect } from "@jest/globals";
import { createDefaultPages } from "./pages-utils";

test("createDefaultPages", () => {
  expect(
    createDefaultPages({
      rootInstanceId: "rootInstanceId",
      homePageId: "homePageId",
    })
  ).toEqual({
    meta: {},
    homePage: {
      id: "homePageId",
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId: "rootInstanceId",
    },
    pages: [],
    folders: [
      {
        id: "root",
        name: "Root",
        slug: "",
        children: ["homePageId"],
      },
    ],
  });
});
