import { describe, expect, test } from "vitest";
import {
  ALLOWED_FILE_TYPES,
  getAssetTextEditorLanguage,
  isTextFileAsset,
} from "@webstudio-is/sdk";
import {
  getTextFileEditorExtensions,
  isMarkdownAsset,
  renderMarkdown,
} from "./text-file-utils";

describe("text file assets", () => {
  test("detects formats case-insensitively", () => {
    expect(isTextFileAsset({ format: "JSON" })).toBe(true);
    expect(getTextFileEditorExtensions({ format: "JSON" })).toHaveLength(1);
  });

  test("does not open unsupported files", () => {
    expect(isTextFileAsset({ format: "pdf" })).toBe(false);
  });

  test.each(["md", "js", "css", "json", "html", "xml", "svg"])(
    "uses the available CodeMirror language for %s",
    (format) => {
      expect(getTextFileEditorExtensions({ format })).toHaveLength(1);
    }
  );

  test.each(["txt", "csv"])("uses plain text editing for %s", (format) => {
    expect(getTextFileEditorExtensions({ format })).toEqual([]);
  });

  test.each(Object.keys(ALLOWED_FILE_TYPES))(
    "defines editor behavior for %s files",
    (format) => {
      const language = getAssetTextEditorLanguage({ format });
      expect(isTextFileAsset({ format })).toBe(language !== undefined);
      expect(getTextFileEditorExtensions({ format })).toHaveLength(
        language === undefined || language === "plain" ? 0 : 1
      );
    }
  );

  test("identifies Markdown files case-insensitively", () => {
    expect(isMarkdownAsset({ format: "MD" })).toBe(true);
    expect(isMarkdownAsset({ format: "txt" })).toBe(false);
  });

  test("renders a safe GFM preview", () => {
    const html = renderMarkdown(
      "~~done~~\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))"
    );
    expect(html).toContain("<del>done</del>");
    expect(html).toContain("<table>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain('href="javascript:');
  });
});
