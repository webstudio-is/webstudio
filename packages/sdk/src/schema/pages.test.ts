import { describe, expect, test } from "vitest";
import {
  documentTypes,
  redirectSourcePath,
  pageAuth,
  pagePath,
  pages,
  projectMeta,
  projectNewRedirectPath,
} from "./pages";
import type { Page } from "./pages";

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
    pages.safeParse({
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
    pages.safeParse({
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
    pages.safeParse({
      ...validPages,
      pages: new Map<string, Page>(validPages.pages).set("home", {
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

test("validates home page is not draft", () => {
  expect(
    pages.safeParse({
      ...validPages,
      pages: new Map<string, Page>(validPages.pages).set("home", {
        ...validPages.pages.get("home")!,
        isDraft: true,
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["pages", "home", "isDraft"],
      message: "Home page can't be draft",
    }),
  ]);
});

test("validates catch-all 404 page is not draft", () => {
  expect(
    pages.safeParse({
      ...validPages,
      pages: new Map<string, Page>(validPages.pages).set("not-found", {
        id: "not-found",
        name: "404",
        path: "/*",
        title: `"Page not found"`,
        meta: { status: "404" },
        rootInstanceId: "notFoundRoot",
        isDraft: true,
      }),
      folders: new Map(validPages.folders).set("root", {
        ...validPages.folders.get("root")!,
        children: ["home", "not-found"],
      }),
    }).error?.issues
  ).toEqual([
    expect.objectContaining({
      path: ["pages", "not-found", "isDraft"],
      message: "Catch-all 404 page can't be draft",
    }),
  ]);
});

test("validates non-home page path is not empty", () => {
  expect(
    pages.safeParse({
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
    pages.safeParse({
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

test("supports project agent instructions", () => {
  expect(
    projectMeta.parse({
      agentInstructions:
        "Use the existing design tokens and keep copy concise.",
    })
  ).toEqual({
    agentInstructions: "Use the existing design tokens and keep copy concise.",
  });
});

test("validates page id matches its record key", () => {
  expect(
    pages.safeParse({
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
    pages.safeParse({
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
    pages.safeParse({
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
    pages.safeParse({
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
    pages.safeParse({
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
      pageAuth.parse({
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
      pageAuth.parse({
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
      pageAuth.safeParse({
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
    pages.safeParse({
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
    pages.safeParse({
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

describe("redirectSourcePath", () => {
  describe("basic validation", () => {
    test("accepts valid path", () => {
      expect(redirectSourcePath.safeParse("/about").success).toBe(true);
      expect(redirectSourcePath.safeParse("/blog/post").success).toBe(true);
    });

    test("rejects empty string", () => {
      const result = redirectSourcePath.safeParse("");
      expect(result.success).toBe(false);
    });

    test("rejects just a slash", () => {
      const result = redirectSourcePath.safeParse("/");
      expect(result.success).toBe(false);
    });

    test("must start with /", () => {
      const result = redirectSourcePath.safeParse("about");
      expect(result.success).toBe(false);
    });

    test("accepts trailing slash", () => {
      const result = redirectSourcePath.safeParse("/about/");
      expect(result.success).toBe(true);
    });

    test("accepts repeated slashes inside the path", () => {
      const result = redirectSourcePath.safeParse("/about//page");
      expect(result.success).toBe(true);
    });

    test("rejects protocol-relative paths", () => {
      const result = redirectSourcePath.safeParse("//example.com/path");
      expect(result.success).toBe(false);
    });

    test("rejects /s prefix (reserved)", () => {
      expect(redirectSourcePath.safeParse("/s").success).toBe(false);
      expect(redirectSourcePath.safeParse("/s/css").success).toBe(false);
    });

    test("rejects /build prefix (reserved)", () => {
      expect(redirectSourcePath.safeParse("/build").success).toBe(false);
      expect(redirectSourcePath.safeParse("/build/main.js").success).toBe(
        false
      );
    });
  });

  describe("special characters", () => {
    test("accepts wildcards", () => {
      expect(redirectSourcePath.safeParse("/blog/*").success).toBe(true);
    });

    test("accepts dynamic segments", () => {
      expect(redirectSourcePath.safeParse("/:slug").success).toBe(true);
      expect(redirectSourcePath.safeParse("/blog/:id").success).toBe(true);
    });

    test("accepts optional segments", () => {
      expect(redirectSourcePath.safeParse("/:id?").success).toBe(true);
    });

    test("accepts query strings", () => {
      expect(redirectSourcePath.safeParse("/search?q=test").success).toBe(true);
      expect(
        redirectSourcePath.safeParse("/path?url=https://example.com/a?b=c")
          .success
      ).toBe(true);
    });

    test("accepts URL-encoded characters", () => {
      expect(redirectSourcePath.safeParse("/hello%20world").success).toBe(true);
      expect(redirectSourcePath.safeParse("/%E6%B8%AF%E8%81%9E").success).toBe(
        true
      );
    });
  });

  describe("browser-requestable characters", () => {
    test("accepts spaces", () => {
      expect(redirectSourcePath.safeParse("/hello world").success).toBe(true);
      expect(redirectSourcePath.safeParse("/path with spaces").success).toBe(
        true
      );
    });

    test("accepts characters browsers encode in paths", () => {
      expect(redirectSourcePath.safeParse("/path<script>").success).toBe(true);
      expect(redirectSourcePath.safeParse("/path>other").success).toBe(true);
      expect(redirectSourcePath.safeParse('/path"quote').success).toBe(true);
      expect(redirectSourcePath.safeParse("/path{test}").success).toBe(true);
      expect(redirectSourcePath.safeParse("/path|other").success).toBe(true);
      expect(redirectSourcePath.safeParse("/path[0]").success).toBe(true);
      expect(redirectSourcePath.safeParse("/path`backtick").success).toBe(true);
    });

    test("rejects backslash because URL parsers normalize it to slash", () => {
      expect(redirectSourcePath.safeParse("/path\\other").success).toBe(false);
    });

    test("rejects control characters", () => {
      expect(redirectSourcePath.safeParse("/line\nfeed").success).toBe(false);
      expect(redirectSourcePath.safeParse("/tab\tfeed").success).toBe(false);
    });
  });

  describe("non-Latin characters (Unicode/UTF-8)", () => {
    test("accepts Chinese characters (Simplified)", () => {
      expect(redirectSourcePath.safeParse("/关于我们").success).toBe(true);
      expect(redirectSourcePath.safeParse("/产品/手机").success).toBe(true);
      expect(redirectSourcePath.safeParse("/新闻").success).toBe(true);
    });

    test("accepts Chinese characters (Traditional)", () => {
      expect(redirectSourcePath.safeParse("/關於我們").success).toBe(true);
      expect(redirectSourcePath.safeParse("/港聞").success).toBe(true);
      expect(redirectSourcePath.safeParse("/繁體中文").success).toBe(true);
    });

    test("accepts Japanese characters (Hiragana)", () => {
      expect(redirectSourcePath.safeParse("/こんにちは").success).toBe(true);
      expect(redirectSourcePath.safeParse("/ブログ/記事").success).toBe(true);
    });

    test("accepts Japanese characters (Katakana)", () => {
      expect(redirectSourcePath.safeParse("/カテゴリ").success).toBe(true);
    });

    test("accepts Japanese characters (Kanji)", () => {
      expect(redirectSourcePath.safeParse("/日本語").success).toBe(true);
      expect(redirectSourcePath.safeParse("/東京").success).toBe(true);
    });

    test("accepts Korean characters (Hangul)", () => {
      expect(redirectSourcePath.safeParse("/한국어").success).toBe(true);
      expect(redirectSourcePath.safeParse("/블로그/포스트").success).toBe(true);
      expect(redirectSourcePath.safeParse("/서울").success).toBe(true);
    });

    test("accepts Cyrillic characters", () => {
      expect(redirectSourcePath.safeParse("/привет").success).toBe(true);
      expect(redirectSourcePath.safeParse("/о-нас").success).toBe(true);
      expect(redirectSourcePath.safeParse("/блог/статья").success).toBe(true);
    });

    test("accepts Arabic characters", () => {
      expect(redirectSourcePath.safeParse("/مرحبا").success).toBe(true);
      expect(redirectSourcePath.safeParse("/عن-الشركة").success).toBe(true);
    });

    test("accepts Hebrew characters", () => {
      expect(redirectSourcePath.safeParse("/שלום").success).toBe(true);
      expect(redirectSourcePath.safeParse("/אודות").success).toBe(true);
    });

    test("accepts Thai characters", () => {
      expect(redirectSourcePath.safeParse("/สวัสดี").success).toBe(true);
      expect(redirectSourcePath.safeParse("/เกี่ยวกับเรา").success).toBe(true);
    });

    test("accepts Greek characters", () => {
      expect(redirectSourcePath.safeParse("/γεια").success).toBe(true);
      expect(redirectSourcePath.safeParse("/σχετικά").success).toBe(true);
    });

    test("accepts mixed Latin and non-Latin characters", () => {
      expect(redirectSourcePath.safeParse("/blog/关于").success).toBe(true);
      expect(redirectSourcePath.safeParse("/news/港聞").success).toBe(true);
      expect(redirectSourcePath.safeParse("/category/日本語").success).toBe(
        true
      );
    });

    test("accepts European characters with diacritics", () => {
      expect(redirectSourcePath.safeParse("/über-uns").success).toBe(true);
      expect(redirectSourcePath.safeParse("/café").success).toBe(true);
      expect(redirectSourcePath.safeParse("/niño").success).toBe(true);
      expect(redirectSourcePath.safeParse("/naïve").success).toBe(true);
      expect(redirectSourcePath.safeParse("/résumé").success).toBe(true);
    });

    test("accepts emoji characters", () => {
      expect(redirectSourcePath.safeParse("/🎉").success).toBe(true);
      expect(redirectSourcePath.safeParse("/hello-🌍").success).toBe(true);
    });
  });
});

describe("pagePath", () => {
  describe("path length validation", () => {
    test("accepts a path of exactly 255 characters", () => {
      const path = "/" + "a".repeat(254);
      expect(pagePath.safeParse(path).success).toBe(true);
    });

    test("rejects a path exceeding 255 characters", () => {
      const path = "/" + "a".repeat(255);
      const result = pagePath.safeParse(path);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Path can't exceed 255 characters"
        );
      }
    });
  });
});

describe("projectNewRedirectPath", () => {
  test("accepts relative paths", () => {
    expect(projectNewRedirectPath.safeParse("/about").success).toBe(true);
    expect(projectNewRedirectPath.safeParse("/").success).toBe(true);
  });

  test("accepts absolute URLs", () => {
    expect(
      projectNewRedirectPath.safeParse("https://example.com/page").success
    ).toBe(true);
  });

  test("accepts non-Latin character paths", () => {
    expect(projectNewRedirectPath.safeParse("/关于我们").success).toBe(true);
    expect(projectNewRedirectPath.safeParse("/日本語").success).toBe(true);
    expect(projectNewRedirectPath.safeParse("/한국어").success).toBe(true);
  });

  test("rejects empty string", () => {
    expect(projectNewRedirectPath.safeParse("").success).toBe(false);
  });

  test("rejects truly invalid URLs", () => {
    expect(projectNewRedirectPath.safeParse("http://[invalid").success).toBe(
      false
    );
  });
});
