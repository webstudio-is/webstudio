import { describe, expect, test } from "vitest";
import {
  documentTypes,
  RedirectSourcePath,
  PageAuth,
  PagePath,
  Pages,
  ProjectNewRedirectPath,
} from "./pages";

const validPages = {
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

test("validates home page id references an existing page", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      homePageId: "missing",
    }).error?.issues
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: ["homePageId"],
        message: "Home page must reference an existing page",
      }),
    ])
  );
});

test("validates root folder id references an existing folder", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      rootFolderId: "missing",
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["rootFolderId"],
      message: "Root folder must reference an existing folder",
    }),
  ]);
});

test("validates home page path is empty", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      pages: new Map(validPages.pages).set("home", {
        ...validPages.pages.get("home")!,
        path: "/home",
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["pages", "home", "path"],
      message: "Home page path must be empty",
    }),
  ]);
});

test("validates non-home page path is not empty", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      pages: new Map(validPages.pages).set("other", {
        id: "other",
        name: "Other",
        path: "",
        title: `"Other"`,
        meta: {},
        rootInstanceId: "otherRoot",
      }),
      folders: new Map(validPages.folders).set("root", {
        ...validPages.folders.get("root")!,
        children: ["home", "other"],
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["pages", "other", "path"],
      message: "Page path can't be empty",
    }),
  ]);
});

test("supports text document type", () => {
  expect(documentTypes).toContain("text");
  expect(
    Pages.safeParse({
      ...validPages,
      pages: new Map(validPages.pages).set("text", {
        id: "text",
        name: "LLMs",
        path: "/llms.txt",
        title: `"LLMs"`,
        meta: { documentType: "text", content: `"Text content"` },
        rootInstanceId: "textRoot",
      }),
      folders: new Map(validPages.folders).set("root", {
        ...validPages.folders.get("root")!,
        children: ["home", "text"],
      }),
    }).success
  ).toBe(true);
});

test("validates page id matches its record key", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      pages: new Map(validPages.pages).set("home", {
        ...validPages.pages.get("home")!,
        id: "other",
      }),
    }).error?.issues
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: ["pages", "home", "id"],
        message: "Page id must match its record key",
      }),
    ])
  );
});

test("validates folder id matches its record key", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      folders: new Map(validPages.folders).set("root", {
        ...validPages.folders.get("root")!,
        id: "other",
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["folders", "root", "id"],
      message: "Folder id must match its record key",
    }),
  ]);
});

test("validates folder children reference existing pages or folders", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      folders: new Map(validPages.folders).set("root", {
        ...validPages.folders.get("root")!,
        children: ["home", "missing"],
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["folders", "root", "children", 1],
      message: "Folder child must reference an existing page or folder",
    }),
  ]);
});

test("validates root folder starts with home page", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      pages: new Map(validPages.pages).set("other", {
        id: "other",
        name: "Other",
        path: "/other",
        title: `"Other"`,
        meta: {},
        rootInstanceId: "otherRoot",
      }),
      folders: new Map(validPages.folders).set("root", {
        ...validPages.folders.get("root")!,
        children: ["other", "home"],
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["folders", "root", "children"],
      message: "Root folder must start with the home page",
    }),
  ]);
});

test("validates root folder is not nested", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      folders: new Map(validPages.folders).set("folder", {
        id: "folder",
        name: "Folder",
        slug: "folder",
        children: ["root"],
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["folders", "folder", "children", 0],
      message: "Root folder can't be nested",
    }),
  ]);
});

describe("PageAuth", () => {
  test("accepts basic auth metadata", () => {
    expect(
      PageAuth.parse({
        method: "basic",
        login: "admin",
        password: "secret",
      })
    ).toEqual({
      method: "basic",
      login: "admin",
      password: "secret",
    });
  });

  test("normalizes legacy basic auth metadata", () => {
    expect(
      PageAuth.parse({
        type: "basic",
        login: "admin",
        password: "secret",
      })
    ).toEqual({
      method: "basic",
      login: "admin",
      password: "secret",
    });
  });

  test("rejects invalid basic auth metadata", () => {
    expect(
      PageAuth.safeParse({
        method: "basic",
        login: "admin:root",
        password: "secret phrase",
      }).error?.issues
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["login"],
          message: "Login can't contain a colon",
        }),
        expect.objectContaining({
          path: ["password"],
          message: "Password can't contain whitespace",
        }),
      ])
    );
  });
});

test("validates children are registered in only one folder", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      folders: new Map(validPages.folders).set("folder", {
        id: "folder",
        name: "Folder",
        slug: "folder",
        children: ["home"],
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["folders", "folder", "children", 0],
      message: `Child is already registered in folder "root"`,
    }),
  ]);
});

test("validates folders do not contain cycles", () => {
  expect(
    Pages.safeParse({
      ...validPages,
      folders: new Map([
        ...validPages.folders,
        [
          "folderA",
          {
            id: "folderA",
            name: "Folder A",
            slug: "folder-a",
            children: ["folderB"],
          },
        ],
        [
          "folderB",
          {
            id: "folderB",
            name: "Folder B",
            slug: "folder-b",
            children: ["folderA"],
          },
        ],
      ]),
    }).error?.issues
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: ["folders", "folderA", "children"],
        message: "Folders can't contain cycles",
      }),
    ])
  );
});

describe("RedirectSourcePath", () => {
  describe("basic validation", () => {
    test("accepts valid path", () => {
      expect(RedirectSourcePath.safeParse("/about").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/blog/post").success).toBe(true);
    });

    test("rejects empty string", () => {
      const result = RedirectSourcePath.safeParse("");
      expect(result.success).toBe(false);
    });

    test("rejects just a slash", () => {
      const result = RedirectSourcePath.safeParse("/");
      expect(result.success).toBe(false);
    });

    test("must start with /", () => {
      const result = RedirectSourcePath.safeParse("about");
      expect(result.success).toBe(false);
    });

    test("accepts trailing slash", () => {
      const result = RedirectSourcePath.safeParse("/about/");
      expect(result.success).toBe(true);
    });

    test("accepts repeated slashes inside the path", () => {
      const result = RedirectSourcePath.safeParse("/about//page");
      expect(result.success).toBe(true);
    });

    test("rejects protocol-relative paths", () => {
      const result = RedirectSourcePath.safeParse("//example.com/path");
      expect(result.success).toBe(false);
    });

    test("rejects /s prefix (reserved)", () => {
      expect(RedirectSourcePath.safeParse("/s").success).toBe(false);
      expect(RedirectSourcePath.safeParse("/s/css").success).toBe(false);
    });

    test("rejects /build prefix (reserved)", () => {
      expect(RedirectSourcePath.safeParse("/build").success).toBe(false);
      expect(RedirectSourcePath.safeParse("/build/main.js").success).toBe(
        false
      );
    });
  });

  describe("special characters", () => {
    test("accepts wildcards", () => {
      expect(RedirectSourcePath.safeParse("/blog/*").success).toBe(true);
    });

    test("accepts dynamic segments", () => {
      expect(RedirectSourcePath.safeParse("/:slug").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/blog/:id").success).toBe(true);
    });

    test("accepts optional segments", () => {
      expect(RedirectSourcePath.safeParse("/:id?").success).toBe(true);
    });

    test("accepts query strings", () => {
      expect(RedirectSourcePath.safeParse("/search?q=test").success).toBe(true);
      expect(
        RedirectSourcePath.safeParse("/path?url=https://example.com/a?b=c")
          .success
      ).toBe(true);
    });

    test("accepts URL-encoded characters", () => {
      expect(RedirectSourcePath.safeParse("/hello%20world").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/%E6%B8%AF%E8%81%9E").success).toBe(
        true
      );
    });
  });

  describe("browser-requestable characters", () => {
    test("accepts spaces", () => {
      expect(RedirectSourcePath.safeParse("/hello world").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/path with spaces").success).toBe(
        true
      );
    });

    test("accepts characters browsers encode in paths", () => {
      expect(RedirectSourcePath.safeParse("/path<script>").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/path>other").success).toBe(true);
      expect(RedirectSourcePath.safeParse('/path"quote').success).toBe(true);
      expect(RedirectSourcePath.safeParse("/path{test}").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/path|other").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/path[0]").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/path`backtick").success).toBe(true);
    });

    test("rejects backslash because URL parsers normalize it to slash", () => {
      expect(RedirectSourcePath.safeParse("/path\\other").success).toBe(false);
    });

    test("rejects control characters", () => {
      expect(RedirectSourcePath.safeParse("/line\nfeed").success).toBe(false);
      expect(RedirectSourcePath.safeParse("/tab\tfeed").success).toBe(false);
    });
  });

  describe("non-Latin characters (Unicode/UTF-8)", () => {
    test("accepts Chinese characters (Simplified)", () => {
      expect(RedirectSourcePath.safeParse("/关于我们").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/产品/手机").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/新闻").success).toBe(true);
    });

    test("accepts Chinese characters (Traditional)", () => {
      expect(RedirectSourcePath.safeParse("/關於我們").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/港聞").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/繁體中文").success).toBe(true);
    });

    test("accepts Japanese characters (Hiragana)", () => {
      expect(RedirectSourcePath.safeParse("/こんにちは").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/ブログ/記事").success).toBe(true);
    });

    test("accepts Japanese characters (Katakana)", () => {
      expect(RedirectSourcePath.safeParse("/カテゴリ").success).toBe(true);
    });

    test("accepts Japanese characters (Kanji)", () => {
      expect(RedirectSourcePath.safeParse("/日本語").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/東京").success).toBe(true);
    });

    test("accepts Korean characters (Hangul)", () => {
      expect(RedirectSourcePath.safeParse("/한국어").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/블로그/포스트").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/서울").success).toBe(true);
    });

    test("accepts Cyrillic characters", () => {
      expect(RedirectSourcePath.safeParse("/привет").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/о-нас").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/блог/статья").success).toBe(true);
    });

    test("accepts Arabic characters", () => {
      expect(RedirectSourcePath.safeParse("/مرحبا").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/عن-الشركة").success).toBe(true);
    });

    test("accepts Hebrew characters", () => {
      expect(RedirectSourcePath.safeParse("/שלום").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/אודות").success).toBe(true);
    });

    test("accepts Thai characters", () => {
      expect(RedirectSourcePath.safeParse("/สวัสดี").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/เกี่ยวกับเรา").success).toBe(true);
    });

    test("accepts Greek characters", () => {
      expect(RedirectSourcePath.safeParse("/γεια").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/σχετικά").success).toBe(true);
    });

    test("accepts mixed Latin and non-Latin characters", () => {
      expect(RedirectSourcePath.safeParse("/blog/关于").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/news/港聞").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/category/日本語").success).toBe(
        true
      );
    });

    test("accepts European characters with diacritics", () => {
      expect(RedirectSourcePath.safeParse("/über-uns").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/café").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/niño").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/naïve").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/résumé").success).toBe(true);
    });

    test("accepts emoji characters", () => {
      expect(RedirectSourcePath.safeParse("/🎉").success).toBe(true);
      expect(RedirectSourcePath.safeParse("/hello-🌍").success).toBe(true);
    });
  });
});

describe("PagePath", () => {
  describe("path length validation", () => {
    test("accepts a path of exactly 255 characters", () => {
      const path = "/" + "a".repeat(254);
      expect(PagePath.safeParse(path).success).toBe(true);
    });

    test("rejects a path exceeding 255 characters", () => {
      const path = "/" + "a".repeat(255);
      const result = PagePath.safeParse(path);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Path can't exceed 255 characters"
        );
      }
    });
  });
});

describe("ProjectNewRedirectPath", () => {
  test("accepts relative paths", () => {
    expect(ProjectNewRedirectPath.safeParse("/about").success).toBe(true);
    expect(ProjectNewRedirectPath.safeParse("/").success).toBe(true);
  });

  test("accepts absolute URLs", () => {
    expect(
      ProjectNewRedirectPath.safeParse("https://example.com/page").success
    ).toBe(true);
  });

  test("accepts non-Latin character paths", () => {
    expect(ProjectNewRedirectPath.safeParse("/关于我们").success).toBe(true);
    expect(ProjectNewRedirectPath.safeParse("/日本語").success).toBe(true);
    expect(ProjectNewRedirectPath.safeParse("/한국어").success).toBe(true);
  });

  test("rejects empty string", () => {
    expect(ProjectNewRedirectPath.safeParse("").success).toBe(false);
  });

  test("rejects truly invalid URLs", () => {
    expect(ProjectNewRedirectPath.safeParse("http://[invalid").success).toBe(
      false
    );
  });
});
