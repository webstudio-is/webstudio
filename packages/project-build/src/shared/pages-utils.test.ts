import { describe, test, expect } from "@jest/globals";
import type { Page } from "@webstudio-is/sdk";
import { findPageByIdOrPath } from "./pages-utils";

const pages = {
  homePage: {
    id: "home",
    path: "/",
    name: "Home",
    title: "Home",
    rootInstanceId: "instance-1",
    meta: {},
  } satisfies Page,
  pages: [
    {
      id: "page1",
      path: "/page1",
      name: "Page",
      title: "Page",
      rootInstanceId: "instance-1",
      meta: {},
    } satisfies Page,
  ],
};

describe("Find by id or path", () => {
  test("home page by id", () => {
    const page = findPageByIdOrPath(pages, "home");
    expect(page).toEqual(pages.homePage);
  });
  test("home page by path /", () => {
    const page = findPageByIdOrPath(pages, "/");
    expect(page).toEqual(pages.homePage);
  });
  test("home page by empty path", () => {
    const page = findPageByIdOrPath(pages, "");
    expect(page).toEqual(pages.homePage);
  });
  test("find page by id", () => {
    const page = findPageByIdOrPath(pages, "page1");
    expect(page).toEqual(pages.pages[0]);
  });
  test("find page by path", () => {
    const page = findPageByIdOrPath(pages, "/page1");
    expect(page).toEqual(pages.pages[0]);
  });
});
