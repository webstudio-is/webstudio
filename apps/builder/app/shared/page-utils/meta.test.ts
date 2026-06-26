import { describe, expect, test } from "vitest";
import { createRootFolder } from "@webstudio-is/project-build";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import { updatePageFieldsMutable } from "./meta";

const createPages = () =>
  migratePages({
    meta: {},
    homePage: {
      id: "home",
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId: "homeBody",
    },
    pages: [
      {
        id: "page",
        name: "Page",
        path: "/page",
        title: `"Page"`,
        meta: {
          language: "en",
          socialImageAssetId: "asset",
        },
        rootInstanceId: "pageBody",
      },
    ],
    folders: [
      createRootFolder(["home", "page", "folder"]),
      { id: "folder", name: "Folder", slug: "folder", children: [] },
    ],
  });

describe("updatePageFieldsMutable", () => {
  test("updates page fields and keeps home page path empty", () => {
    const pages = createPages();
    const page = pages.pages.get("home");

    updatePageFieldsMutable({
      page: page!,
      pages,
      values: {
        name: "Landing",
        path: "/landing",
        title: `"Landing"`,
      },
    });

    expect(page).toMatchObject({
      name: "Landing",
      path: "",
      title: `"Landing"`,
    });
  });

  test("removes empty optional metadata fields", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    updatePageFieldsMutable({
      page: page!,
      pages,
      values: {
        language: "",
        socialImageAssetId: "",
      },
    });

    expect(page?.meta.language).toBeUndefined();
    expect(page?.meta.socialImageAssetId).toBeUndefined();
  });

  test("moves page to another folder", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    updatePageFieldsMutable({
      page: page!,
      pages,
      values: { parentFolderId: "folder" },
    });

    expect(pages.folders.get(pages.rootFolderId)?.children).toEqual([
      "home",
      "folder",
    ]);
    expect(pages.folders.get("folder")?.children).toEqual(["page"]);
  });
});
