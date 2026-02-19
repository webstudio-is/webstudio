import { describe, test, expect } from "vitest";
import { OldPagePath, ProjectNewRedirectPath } from "./pages";

describe("OldPagePath", () => {
  describe("basic validation", () => {
    test("accepts valid path", () => {
      expect(OldPagePath.safeParse("/about").success).toBe(true);
      expect(OldPagePath.safeParse("/blog/post").success).toBe(true);
    });

    test("rejects empty string", () => {
      const result = OldPagePath.safeParse("");
      expect(result.success).toBe(false);
    });

    test("rejects just a slash", () => {
      const result = OldPagePath.safeParse("/");
      expect(result.success).toBe(false);
    });

    test("must start with /", () => {
      const result = OldPagePath.safeParse("about");
      expect(result.success).toBe(false);
    });

    test("cannot end with /", () => {
      const result = OldPagePath.safeParse("/about/");
      expect(result.success).toBe(false);
    });

    test("cannot contain //", () => {
      const result = OldPagePath.safeParse("/about//page");
      expect(result.success).toBe(false);
    });

    test("rejects /s prefix (reserved)", () => {
      expect(OldPagePath.safeParse("/s").success).toBe(false);
      expect(OldPagePath.safeParse("/s/css").success).toBe(false);
    });

    test("rejects /build prefix (reserved)", () => {
      expect(OldPagePath.safeParse("/build").success).toBe(false);
      expect(OldPagePath.safeParse("/build/main.js").success).toBe(false);
    });
  });

  describe("special characters", () => {
    test("accepts wildcards", () => {
      expect(OldPagePath.safeParse("/blog/*").success).toBe(true);
    });

    test("accepts dynamic segments", () => {
      expect(OldPagePath.safeParse("/:slug").success).toBe(true);
      expect(OldPagePath.safeParse("/blog/:id").success).toBe(true);
    });

    test("accepts optional segments", () => {
      expect(OldPagePath.safeParse("/:id?").success).toBe(true);
    });

    test("accepts query strings", () => {
      expect(OldPagePath.safeParse("/search?q=test").success).toBe(true);
    });

    test("accepts URL-encoded characters", () => {
      expect(OldPagePath.safeParse("/hello%20world").success).toBe(true);
      expect(OldPagePath.safeParse("/%E6%B8%AF%E8%81%9E").success).toBe(true);
    });
  });

  describe("invalid characters", () => {
    test("rejects spaces", () => {
      const result = OldPagePath.safeParse("/hello world");
      expect(result.success).toBe(false);
    });

    test("rejects angle brackets", () => {
      expect(OldPagePath.safeParse("/path<script>").success).toBe(false);
      expect(OldPagePath.safeParse("/path>other").success).toBe(false);
    });

    test("rejects quotes", () => {
      expect(OldPagePath.safeParse('/path"quote').success).toBe(false);
    });

    test("rejects curly braces", () => {
      expect(OldPagePath.safeParse("/path{test}").success).toBe(false);
    });

    test("rejects pipe", () => {
      expect(OldPagePath.safeParse("/path|other").success).toBe(false);
    });

    test("rejects backslash", () => {
      expect(OldPagePath.safeParse("/path\\other").success).toBe(false);
    });

    test("rejects square brackets", () => {
      expect(OldPagePath.safeParse("/path[0]").success).toBe(false);
    });
  });

  describe("non-Latin characters (Unicode/UTF-8)", () => {
    // Chinese characters - common in Chinese websites
    // Examples from https://aubreyyung.com/chinese-url-seo/
    test("accepts Chinese characters (Simplified)", () => {
      expect(OldPagePath.safeParse("/关于我们").success).toBe(true);
      expect(OldPagePath.safeParse("/产品/手机").success).toBe(true);
      expect(OldPagePath.safeParse("/新闻").success).toBe(true);
    });

    test("accepts Chinese characters (Traditional)", () => {
      expect(OldPagePath.safeParse("/關於我們").success).toBe(true);
      expect(OldPagePath.safeParse("/港聞").success).toBe(true);
      expect(OldPagePath.safeParse("/繁體中文").success).toBe(true);
    });

    // Japanese characters
    test("accepts Japanese characters (Hiragana)", () => {
      expect(OldPagePath.safeParse("/こんにちは").success).toBe(true);
      expect(OldPagePath.safeParse("/ブログ/記事").success).toBe(true);
    });

    test("accepts Japanese characters (Katakana)", () => {
      expect(OldPagePath.safeParse("/カテゴリ").success).toBe(true);
    });

    test("accepts Japanese characters (Kanji)", () => {
      expect(OldPagePath.safeParse("/日本語").success).toBe(true);
      expect(OldPagePath.safeParse("/東京").success).toBe(true);
    });

    // Korean characters
    test("accepts Korean characters (Hangul)", () => {
      expect(OldPagePath.safeParse("/한국어").success).toBe(true);
      expect(OldPagePath.safeParse("/블로그/포스트").success).toBe(true);
      expect(OldPagePath.safeParse("/서울").success).toBe(true);
    });

    // Cyrillic characters (Russian, etc.)
    test("accepts Cyrillic characters", () => {
      expect(OldPagePath.safeParse("/привет").success).toBe(true);
      expect(OldPagePath.safeParse("/о-нас").success).toBe(true);
      expect(OldPagePath.safeParse("/блог/статья").success).toBe(true);
    });

    // Arabic characters
    test("accepts Arabic characters", () => {
      expect(OldPagePath.safeParse("/مرحبا").success).toBe(true);
      expect(OldPagePath.safeParse("/عن-الشركة").success).toBe(true);
    });

    // Hebrew characters
    test("accepts Hebrew characters", () => {
      expect(OldPagePath.safeParse("/שלום").success).toBe(true);
      expect(OldPagePath.safeParse("/אודות").success).toBe(true);
    });

    // Thai characters
    test("accepts Thai characters", () => {
      expect(OldPagePath.safeParse("/สวัสดี").success).toBe(true);
      expect(OldPagePath.safeParse("/เกี่ยวกับเรา").success).toBe(true);
    });

    // Greek characters
    test("accepts Greek characters", () => {
      expect(OldPagePath.safeParse("/γεια").success).toBe(true);
      expect(OldPagePath.safeParse("/σχετικά").success).toBe(true);
    });

    // Mixed Latin and non-Latin
    test("accepts mixed Latin and non-Latin characters", () => {
      expect(OldPagePath.safeParse("/blog/关于").success).toBe(true);
      expect(OldPagePath.safeParse("/news/港聞").success).toBe(true);
      expect(OldPagePath.safeParse("/category/日本語").success).toBe(true);
    });

    // European characters with diacritics
    test("accepts European characters with diacritics", () => {
      expect(OldPagePath.safeParse("/über-uns").success).toBe(true);
      expect(OldPagePath.safeParse("/café").success).toBe(true);
      expect(OldPagePath.safeParse("/niño").success).toBe(true);
      expect(OldPagePath.safeParse("/naïve").success).toBe(true);
      expect(OldPagePath.safeParse("/résumé").success).toBe(true);
    });

    // Emoji (while unusual, they are valid Unicode)
    test("accepts emoji characters", () => {
      expect(OldPagePath.safeParse("/🎉").success).toBe(true);
      expect(OldPagePath.safeParse("/hello-🌍").success).toBe(true);
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
    // Note: ProjectNewRedirectPath uses new URL(data, baseURL) which is very permissive
    // It treats most strings as valid relative paths. The only truly invalid inputs
    // are those that cannot be parsed as URLs at all.
    expect(ProjectNewRedirectPath.safeParse("http://[invalid").success).toBe(
      false
    );
  });
});
