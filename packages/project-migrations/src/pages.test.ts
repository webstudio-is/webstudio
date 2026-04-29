import { expect, test } from "vitest";
import type { Pages } from "@webstudio-is/sdk";
import { migratePages, serializePages } from "./pages";

test("keeps current pages shape unchanged", () => {
  const pages: Pages = {
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "homeRoot",
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
          children: ["home"],
        },
      ],
    ]),
  };

  expect(migratePages(pages)).toBe(pages);
});

test("removes orphan folder children from current pages shape", () => {
  expect(
    migratePages({
      homePageId: "home",
      rootFolderId: "root",
      pages: new Map([
        [
          "home",
          {
            id: "home",
            name: "Home",
            path: "",
            title: `"Home"`,
            meta: {},
            rootInstanceId: "homeRoot",
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
            children: ["home", "missing"],
          },
        ],
      ]),
    }).folders.get("root")?.children
  ).toEqual(["home"]);
});

test("serializes map pages into arrays for JSON storage", () => {
  expect(
    serializePages({
      homePageId: "home",
      rootFolderId: "root",
      pages: new Map([
        [
          "home",
          {
            id: "home",
            name: "Home",
            path: "",
            title: `"Home"`,
            meta: {},
            rootInstanceId: "homeRoot",
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
            children: ["home"],
          },
        ],
      ]),
    })
  ).toEqual({
    meta: undefined,
    compiler: undefined,
    redirects: undefined,
    homePageId: "home",
    rootFolderId: "root",
    pages: [expect.objectContaining({ id: "home" })],
    folders: [expect.objectContaining({ id: "root", children: ["home"] })],
  });
});

test("validates pages before serializing", () => {
  expect(() =>
    serializePages({
      homePageId: "missing",
      rootFolderId: "root",
      pages: new Map(),
      folders: new Map([
        [
          "root",
          {
            id: "root",
            name: "Root",
            slug: "",
            children: [],
          },
        ],
      ]),
    })
  ).toThrow();
});

test("migrates serialized array pages into maps", () => {
  expect(
    migratePages({
      homePageId: "home",
      rootFolderId: "root",
      pages: [
        {
          id: "home",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "homeRoot",
        },
      ],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home"],
        },
      ],
    }).pages
  ).toEqual(new Map([["home", expect.objectContaining({ id: "home" })]]));
});

test("adds missing page meta while migrating serialized pages", () => {
  expect(
    migratePages({
      homePageId: "home",
      rootFolderId: "root",
      pages: [
        {
          id: "home",
          name: "Home",
          path: "",
          title: `"Home"`,
          rootInstanceId: "homeRoot",
        },
      ],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home"],
        },
      ],
    }).pages.get("home")?.meta
  ).toEqual({});
});

test("migrates serialized record pages into maps", () => {
  expect(
    migratePages({
      homePageId: "home",
      rootFolderId: "root",
      pages: {
        home: {
          id: "home",
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: "homeRoot",
        },
      },
      folders: {
        root: {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home"],
        },
      },
    })
  ).toEqual({
    meta: undefined,
    compiler: undefined,
    redirects: undefined,
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([["home", expect.objectContaining({ id: "home" })]]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home"],
        },
      ],
    ]),
  });
});

test("migrates legacy array pages into id-keyed pages and folders", () => {
  expect(
    migratePages({
      meta: { siteName: "Site" },
      homePage: {
        id: "home",
        name: "Home",
        path: "",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "homeRoot",
      },
      pages: [
        {
          id: "nested",
          name: "Nested",
          path: "/nested",
          title: `"Nested"`,
          meta: {},
          rootInstanceId: "nestedRoot",
        },
        {
          id: "orphan",
          name: "Orphan",
          path: "/orphan",
          title: `"Orphan"`,
          meta: {},
          rootInstanceId: "orphanRoot",
        },
      ],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["folder"],
        },
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: ["nested"],
        },
      ],
    })
  ).toEqual({
    meta: { siteName: "Site" },
    compiler: undefined,
    redirects: undefined,
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      ["home", expect.objectContaining({ id: "home" })],
      ["nested", expect.objectContaining({ id: "nested" })],
      ["orphan", expect.objectContaining({ id: "orphan" })],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "folder", "orphan"],
        },
      ],
      [
        "folder",
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: ["nested"],
        },
      ],
    ]),
  });
});

test("moves legacy home page to first root child", () => {
  expect(
    migratePages({
      homePage: {
        id: "home",
        name: "Home",
        path: "",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "homeRoot",
      },
      pages: [],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["folder"],
        },
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: ["home"],
        },
      ],
    }).folders
  ).toEqual(
    new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "folder"],
        },
      ],
      [
        "folder",
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: [],
        },
      ],
    ])
  );
});

test("removes all duplicate legacy home page refs from folders", () => {
  expect(
    migratePages({
      homePage: {
        id: "home",
        name: "Home",
        path: "",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "homeRoot",
      },
      pages: [],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "home", "folder"],
        },
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: ["home", "home"],
        },
      ],
    }).folders
  ).toEqual(
    new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "folder"],
        },
      ],
      [
        "folder",
        {
          id: "folder",
          name: "Folder",
          slug: "folder",
          children: [],
        },
      ],
    ])
  );
});

test("does not let a legacy page with home id overwrite home page", () => {
  expect(
    migratePages({
      homePage: {
        id: "home",
        name: "Home",
        path: "/",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "homeRoot",
      },
      pages: [
        {
          id: "home",
          name: "Duplicate Home",
          path: "/duplicate",
          title: `"Duplicate Home"`,
          meta: {},
          rootInstanceId: "duplicateRoot",
        },
      ],
      folders: [
        {
          id: "root",
          name: "Root",
          slug: "",
          children: [],
        },
      ],
    }).pages.get("home")
  ).toEqual(
    expect.objectContaining({
      name: "Home",
      path: "",
      rootInstanceId: "homeRoot",
    })
  );
});

test("migrates legacy pages without folders into root folder", () => {
  expect(
    migratePages({
      homePage: {
        id: "home",
        name: "Home",
        path: "/",
        title: `"Home"`,
        meta: {},
        rootInstanceId: "homeRoot",
      },
      pages: [
        {
          id: "page",
          name: "Page",
          path: "/page",
          title: `"Page"`,
          meta: {},
          rootInstanceId: "pageRoot",
        },
      ],
    })
  ).toEqual({
    meta: undefined,
    compiler: undefined,
    redirects: undefined,
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        expect.objectContaining({
          id: "home",
          path: "",
        }),
      ],
      ["page", expect.objectContaining({ id: "page" })],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "Root",
          slug: "",
          children: ["home", "page"],
        },
      ],
    ]),
  });
});

test("throws on unsupported pages shape", () => {
  expect(() => migratePages({ pages: [], folders: [] })).toThrow(
    "Pages data has unsupported shape."
  );
});
