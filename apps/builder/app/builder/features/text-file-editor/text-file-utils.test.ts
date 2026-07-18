import { describe, expect, test } from "vitest";
import { getTextFileEditorLanguage, isTextFileAsset } from "./text-file-utils";

describe("text file assets", () => {
  test.each(["txt", "csv", "md", "js", "css", "json", "html", "xml"])(
    "supports %s files",
    (format) => {
      expect(isTextFileAsset({ format })).toBe(true);
    }
  );

  test("detects formats case-insensitively", () => {
    expect(isTextFileAsset({ format: "JSON" })).toBe(true);
    expect(getTextFileEditorLanguage({ format: "JSON" })).toBe("json");
  });

  test("does not open unsupported files", () => {
    expect(isTextFileAsset({ format: "pdf" })).toBe(false);
  });

  test.each([
    ["txt", undefined],
    ["csv", undefined],
    ["md", "markdown"],
    ["js", "javascript"],
    ["css", "css"],
    ["json", "json"],
    ["html", "html"],
    ["xml", "html"],
  ])("uses the CodeMirror language for %s", (format, language) => {
    expect(getTextFileEditorLanguage({ format })).toBe(language);
  });
});
