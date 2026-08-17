import { describe, expect, test } from "vitest";
import {
  ALLOWED_FILE_TYPES,
  getAssetTextEditorLanguage,
  isTextFileAsset,
} from "@webstudio-is/sdk";
import {
  getTextFileEditorExtensions,
  isMarkdownPreviewAsset,
  isMarkdownSyntaxAsset,
  normalizeTextFileContent,
} from "./text-file-utils";

describe("text file assets", () => {
  test("detects formats case-insensitively", () => {
    expect(isTextFileAsset({ format: "JSON" })).toBe(true);
    expect(getTextFileEditorExtensions({ format: "JSON" })).toHaveLength(1);
  });

  test("does not open unsupported files", () => {
    expect(isTextFileAsset({ format: "pdf" })).toBe(false);
  });

  test.each(["md", "mdx", "js", "css", "json", "html", "xml", "svg"])(
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

  test("identifies files that use Markdown syntax", () => {
    expect(isMarkdownSyntaxAsset({ format: "MD" })).toBe(true);
    expect(isMarkdownSyntaxAsset({ format: "mdx" })).toBe(true);
    expect(isMarkdownSyntaxAsset({ format: "txt" })).toBe(false);
  });

  test("limits the Markdown preview to .md files", () => {
    expect(isMarkdownPreviewAsset({ format: "MD" })).toBe(true);
    expect(isMarkdownPreviewAsset({ format: "mdx" })).toBe(false);
  });

  test("normalizes JSON-compatible object expressions to strict JSON", () => {
    expect(
      normalizeTextFileContent(
        { format: "json" },
        "{ title: 'Post', tags: ['one', 'two'], }"
      )
    ).toEqual({
      content:
        '{\n  "title": "Post",\n  "tags": [\n    "one",\n    "two"\n  ]\n}\n',
    });
  });

  test("rejects executable content and accepts every JSON root type", () => {
    expect(
      normalizeTextFileContent({ format: "json" }, "{ value: fetch('/') }")
    ).toEqual({ error: "Enter a JSON-compatible value." });
    expect(normalizeTextFileContent({ format: "json" }, "[1, 'two']")).toEqual({
      content: '[\n  1,\n  "two"\n]\n',
    });
    expect(normalizeTextFileContent({ format: "json" }, "null")).toEqual({
      content: "null\n",
    });
  });

  test("preserves non-JSON text content", () => {
    expect(normalizeTextFileContent({ format: "md" }, "anything")).toEqual({
      content: "anything",
    });
  });

  test("rejects incomplete object syntax", () => {
    expect(normalizeTextFileContent({ format: "json" }, "{ title:")).toEqual({
      error: "Enter a JSON-compatible value.",
    });
  });
});
