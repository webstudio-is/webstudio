import { describe, expect, test } from "vitest";
import { ALLOWED_FILE_TYPES, isTextFileAsset } from "@webstudio-is/sdk";
import { getTextFileEditorExtensions } from "./text-file-utils";

describe("text file assets", () => {
  const supportedTextFormats = Object.entries(ALLOWED_FILE_TYPES)
    .filter(
      ([, mimeType]) =>
        mimeType.startsWith("text/") ||
        mimeType === "application/json" ||
        mimeType === "application/xml" ||
        mimeType === "image/svg+xml"
    )
    .map(([format]) => format);

  test.each(supportedTextFormats)("supports %s files", (format) => {
    expect(isTextFileAsset({ format })).toBe(true);
  });

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
});
