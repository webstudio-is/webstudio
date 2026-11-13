import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { getCollectionEntryCanvasTarget } from "./collection-entry-navigation";

const createPages = (path: string) => {
  const pages = createDefaultPages({ rootInstanceId: "root" });
  pages.pages.set("article", {
    id: "article",
    path,
    name: "Article",
    title: "Article",
    rootInstanceId: "article-root",
    meta: {},
  });
  pages.folders.get(pages.rootFolderId)?.children.push("article");
  return pages;
};

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

  test("does not offer a static page that cannot identify an entry", () => {
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId: "article",
        entryBasename: "hello-world",
        pages: createPages("/blog"),
      })
    ).toBeUndefined();
  });

  test.each([
    [undefined, "/blog/:slug"],
    ["missing", "/blog/:slug"],
    ["article", "/:category/:slug"],
  ])("does not offer navigation for page %s at %s", (entryPageId, path) => {
    expect(
      getCollectionEntryCanvasTarget({
        entryPageId,
        entryBasename: "hello-world",
        pages: createPages(path),
      })
    ).toBeUndefined();
  });
});
