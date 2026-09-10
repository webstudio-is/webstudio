import { describe, expect, test } from "vitest";
import type { Pages } from "@webstudio-is/sdk";
import { getCollectionEntryCanvasTarget } from "./collection-entry-navigation";

const createPages = (path: string): Pages =>
  ({
    meta: {},
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "article",
        {
          id: "article",
          path,
          name: "Article",
          title: "Article",
          rootInstanceId: "root-instance",
          meta: {},
        },
      ],
    ]),
    folders: new Map([
      ["root", { id: "root", name: "Root", slug: "", children: ["article"] }],
    ]),
    templates: new Map(),
  }) as Pages;

describe("getCollectionEntryCanvasTarget", () => {
  test("opens the configured dynamic page with the entry filename", () => {
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId: "article",
        entryBasename: "hello-world",
        pages: createPages("/blog/:slug"),
      })
    ).toEqual({ pageId: "article", params: { slug: "hello-world" } });
  });

  test("opens a configured static page without parameters", () => {
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId: "article",
        entryBasename: "hello-world",
        pages: createPages("/blog"),
      })
    ).toEqual({ pageId: "article", params: {} });
  });

  test("does not offer navigation for missing or ambiguous pages", () => {
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId: undefined,
        entryBasename: "hello-world",
        pages: createPages("/blog/:slug"),
      })
    ).toBeUndefined();
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId: "missing",
        entryBasename: "hello-world",
        pages: createPages("/blog/:slug"),
      })
    ).toBeUndefined();
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId: "article",
        entryBasename: "hello-world",
        pages: createPages("/:category/:slug"),
      })
    ).toBeUndefined();
  });
});
