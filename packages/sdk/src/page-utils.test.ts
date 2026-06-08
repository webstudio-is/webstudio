import { describe, expect, test } from "vitest";
import type { Pages } from "./schema/pages";
import {
  findPageByIdOrPath,
  findParentFolderByChildId,
  getPagePath,
  getStaticSiteMapXml,
  isPage,
  isPageTemplate,
} from "./page-utils";

const pages = {
  meta: {},
  homePageId: "home",
  rootFolderId: "root",
  pages: new Map([
    [
      "home",
      {
        id: "home",
        path: "",
        name: "Home",
        title: "Home",
        rootInstanceId: "rootInstanceId",
        meta: {},
      },
    ],
    [
      "page-1",
      {
        id: "page-1",
        path: "/page-1",
        name: "Page",
        title: "Page",
        rootInstanceId: "rootInstanceId",
        meta: {},
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
        children: ["folderId-1"],
      },
    ],
    [
      "folderId-1",
      {
        id: "folderId-1",
        name: "Folder 1",
        slug: "folder-1",
        children: ["folderId-1-1"],
      },
    ],
    [
      "folderId-1-1",
      {
        id: "folderId-1-1",
        name: "Folder 1-1",
        slug: "folder-1-1",
        children: ["folderId-1-1-1"],
      },
    ],
    [
      "folderId-1-1-1",
      {
        id: "folderId-1-1-1",
        name: "Folder 1-1-1",
        slug: "folder-1-1-1",
        children: ["page-1"],
      },
    ],
  ]),
} satisfies Pages;

describe("page type guards", () => {
  const page = pages.pages.get("page-1");
  const template = {
    id: "template-1",
    name: "Template",
    title: "Template",
    rootInstanceId: "rootInstanceId",
    meta: {},
  };

  test("detects pages", () => {
    expect(isPage(page)).toBe(true);
    expect(isPage(template)).toBe(false);
    expect(isPage(undefined)).toBe(false);
  });

  test("detects page templates", () => {
    expect(isPageTemplate(page)).toBe(false);
    expect(isPageTemplate(template)).toBe(true);
    expect(isPageTemplate(undefined)).toBe(false);
  });
});

describe("getPagePath", () => {
  test("home page path", () => {
    expect(getPagePath("home", pages)).toEqual("");
  });

  test("nesting level 0", () => {
    expect(getPagePath("root", pages)).toEqual("");
  });

  test("nesting level 1", () => {
    expect(getPagePath("folderId-1", pages)).toEqual("/folder-1");
  });

  test("nesting level 2", () => {
    expect(getPagePath("folderId-1-1", pages)).toEqual("/folder-1/folder-1-1");
  });

  test("nesting level 3", () => {
    expect(getPagePath("folderId-1-1-1", pages)).toEqual(
      "/folder-1/folder-1-1/folder-1-1-1"
    );
  });

  test("page inside folder nesting level 3", () => {
    expect(getPagePath("page-1", pages)).toEqual(
      "/folder-1/folder-1-1/folder-1-1-1/page-1"
    );
  });
});

describe("findPageByIdOrPath", () => {
  test("home page by id", () => {
    const page = findPageByIdOrPath("home", pages);
    expect(page).toEqual(pages.pages.get("home"));
  });
  test("home page by path /", () => {
    const page = findPageByIdOrPath("/", pages);
    expect(page).toEqual(pages.pages.get("home"));
  });
  test("home page by empty path", () => {
    const page = findPageByIdOrPath("", pages);
    expect(page).toEqual(pages.pages.get("home"));
  });
  test("find page by id", () => {
    const page = findPageByIdOrPath("page-1", pages);
    expect(page).toEqual(pages.pages.get("page-1"));
  });
  test("find page by nested path", () => {
    const page = findPageByIdOrPath(
      "/folder-1/folder-1-1/folder-1-1-1/page-1",
      pages
    );
    expect(page).toEqual(pages.pages.get("page-1"));
  });
  test("does not find templates by default", () => {
    const pagesWithTemplate: Pages = {
      ...pages,
      pageTemplates: new Map([
        [
          "template-1",
          {
            id: "template-1",
            name: "Template",
            title: "Template",
            rootInstanceId: "rootInstanceId",
            meta: {},
          },
        ],
      ]),
    };
    expect(findPageByIdOrPath("template-1", pagesWithTemplate)).toBeUndefined();
  });
  test("finds templates when requested", () => {
    const template = {
      id: "template-1",
      name: "Template",
      title: "Template",
      rootInstanceId: "rootInstanceId",
      meta: {},
    };
    const pagesWithTemplate: Pages = {
      ...pages,
      pageTemplates: new Map([["template-1", template]]),
    };
    expect(
      findPageByIdOrPath("template-1", pagesWithTemplate, {
        includeTemplates: true,
      })
    ).toEqual(template);
  });
});

describe("findParentFolderByChildId", () => {
  test("find in root folder", () => {
    expect(
      findParentFolderByChildId("folderId-1-1-1", pages.folders)?.id
    ).toEqual("folderId-1-1");
  });
});

describe("getStaticSiteMapXml", () => {
  test("includes html pages and excludes xml and text pages", () => {
    const pagesWithDocumentTypes: Pages = {
      ...pages,
      pages: new Map(pages.pages)
        .set("xml", {
          id: "xml",
          path: "/sitemap-extra.xml",
          name: "XML",
          title: "XML",
          rootInstanceId: "rootInstanceId",
          meta: { documentType: "xml" },
        })
        .set("text", {
          id: "text",
          path: "/llms.txt",
          name: "LLMs",
          title: "LLMs",
          rootInstanceId: "rootInstanceId",
          meta: { documentType: "text" },
        }),
      folders: new Map(pages.folders).set("root", {
        ...pages.folders.get("root")!,
        children: ["folderId-1", "xml", "text"],
      }),
    };

    expect(getStaticSiteMapXml(pagesWithDocumentTypes, "2026-04-30")).toEqual([
      { path: "", lastModified: "2026-04-30" },
      {
        path: "/folder-1/folder-1-1/folder-1-1-1/page-1",
        lastModified: "2026-04-30",
      },
    ]);
  });
});
