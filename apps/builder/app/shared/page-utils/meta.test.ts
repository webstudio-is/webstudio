import { describe, expect, test } from "vitest";
import { createRootFolder } from "@webstudio-is/project-build";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  createPageUpdatePatches,
  createPageUpdatePayload,
  pageFieldsInput,
  pageMetaInput,
  updatePageFieldsMutable,
} from "./meta";

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

describe("page input schemas", () => {
  test("parse page fields and metadata used by the API", () => {
    expect(
      pageFieldsInput.parse({
        name: "About",
        path: "/about",
        title: "About",
        parentFolderId: "folder",
        meta: {
          description: "About us",
          excludePageFromSearch: true,
          documentType: "html",
          custom: [{ property: "og:title", content: "About" }],
        },
      })
    ).toEqual({
      name: "About",
      path: "/about",
      title: "About",
      parentFolderId: "folder",
      meta: {
        description: "About us",
        excludePageFromSearch: true,
        documentType: "html",
        custom: [{ property: "og:title", content: "About" }],
      },
    });
  });

  test("reject empty page names and invalid document types", () => {
    expect(() => pageFieldsInput.parse({ name: "" })).toThrow();
    expect(() => pageMetaInput.parse({ documentType: "json" })).toThrow();
  });
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

describe("createPageUpdatePatches", () => {
  test("creates field, meta, and folder patches", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePatches({
        input: {
          name: "Updated",
          path: "/updated",
          meta: {
            language: "",
            excludePageFromSearch: true,
          },
          parentFolderId: "folder",
        },
        page: page!,
        pages,
      })
    ).toEqual([
      {
        op: "replace",
        path: ["pages", "page", "name"],
        value: "Updated",
      },
      {
        op: "replace",
        path: ["pages", "page", "path"],
        value: "/updated",
      },
      {
        op: "remove",
        path: ["pages", "page", "meta", "language"],
      },
      {
        op: "add",
        path: ["pages", "page", "meta", "excludePageFromSearch"],
        value: "true",
      },
      {
        op: "remove",
        path: ["folders", pages.rootFolderId, "children", 1],
      },
      {
        op: "add",
        path: ["folders", "folder", "children", 0],
        value: "page",
      },
    ]);
  });

  test("does not remove omitted metadata fields", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePatches({
        input: {
          meta: {
            description: "Updated",
          },
        },
        page: page!,
        pages,
      })
    ).toEqual([
      {
        op: "add",
        path: ["pages", "page", "meta", "description"],
        value: "Updated",
      },
    ]);
  });
});

describe("createPageUpdatePayload", () => {
  test("wraps page update patches in a build payload", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePayload({
        input: { name: "Updated" },
        page: page!,
        pages,
      })
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["pages", "page", "name"],
            value: "Updated",
          },
        ],
      },
    ]);
  });

  test("returns empty payload for noop updates", () => {
    const pages = createPages();
    const page = pages.pages.get("page");

    expect(
      createPageUpdatePayload({
        input: {},
        page: page!,
        pages,
      })
    ).toEqual([]);
  });
});
