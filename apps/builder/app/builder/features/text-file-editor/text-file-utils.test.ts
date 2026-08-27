import { describe, expect, test } from "vitest";
import {
  ALLOWED_FILE_TYPES,
  getAssetTextEditorLanguage,
  isTextFileAsset,
} from "@webstudio-is/sdk";
import {
  getTextFileEditorExtensions,
  getMdxEditorDiagnostics,
  getMdxPersistenceFeedback,
  isMarkdownAsset,
  normalizeTextFileContent,
  normalizeTextFileConversion,
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
        language === undefined || language === "plain"
          ? 0
          : format === "mdx"
            ? 4
            : 1
      );
    }
  );

  test("identifies Markdown files case-insensitively", () => {
    expect(isMarkdownAsset({ format: "MD" })).toBe(true);
    expect(isMarkdownAsset({ format: "txt" })).toBe(false);
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

  test("reports MDX diagnostics at parser source ranges", async () => {
    await expect(
      getMdxEditorDiagnostics("# Kept\n\n{danger()}\n")
    ).resolves.toEqual([
      {
        from: 8,
        to: 18,
        severity: "warning",
        message: "Executable MDX expressions are not supported",
      },
    ]);
  });

  test("reports unrecoverable MDX without blocking the source", async () => {
    const source = "# Kept\n\n<ws.element";
    const diagnostics = await getMdxEditorDiagnostics(source);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      from: source.length,
      to: source.length,
    });
  });

  test("reports connected Content Block warnings at property ranges", async () => {
    const source = '<ws.element ws:name="Card" class="legacy" />';
    await expect(
      getMdxEditorDiagnostics(source, [
        {
          code: "ignored-template-prop",
          severity: "warning",
          blockInstanceId: "block",
          assetId: "asset",
          templateName: "Card",
          propName: "class",
          reason: "incompatible",
          sourceRange: {
            start: { line: 1, column: 28, offset: 27 },
            end: { line: 1, column: 42, offset: 41 },
          },
        },
      ])
    ).resolves.toEqual([
      {
        from: 27,
        to: 41,
        severity: "warning",
        message:
          'Property "class" on template "Card" was ignored because it is incompatible. Line 1, column 28.',
      },
    ]);
  });

  test("reports connected Content Block content-model errors", async () => {
    const source = '<ws.element ws:tag="li">nested item</ws.element>';
    await expect(
      getMdxEditorDiagnostics(source, [
        {
          code: "invalid-mdx",
          severity: "error",
          blockInstanceId: "block",
          assetId: "asset",
          message: "Placing <li> element inside a <li> violates HTML spec.",
          sourceRange: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: source.length + 1, offset: source.length },
          },
        },
      ])
    ).resolves.toEqual([
      {
        from: 0,
        to: source.length,
        severity: "error",
        message: "Placing <li> element inside a <li> violates HTML spec.",
      },
    ]);
  });

  test("keeps failed and conflicting MDX saves visible", () => {
    expect(
      getMdxPersistenceFeedback({
        status: "failed",
        error: new Error("Network unavailable"),
      })
    ).toEqual({ kind: "failed", message: "Network unavailable" });
    expect(
      getMdxPersistenceFeedback({
        status: "conflicting",
      })
    ).toEqual({
      kind: "conflicting",
      message: "This file changed elsewhere. Reload before continuing.",
    });
    expect(getMdxPersistenceFeedback({ status: "saved" })).toBeUndefined();
  });

  test("rejects incomplete object syntax", () => {
    expect(normalizeTextFileContent({ format: "json" }, "{ title:")).toEqual({
      error: "Enter a JSON-compatible value.",
    });
  });

  test("initializes empty content when converting a text file to JSON", () => {
    expect(normalizeTextFileConversion({ format: "json" }, " \n")).toEqual({
      content: "{}\n",
    });
    expect(normalizeTextFileConversion({ format: "json" }, "not json")).toEqual(
      { error: "Enter a JSON-compatible value." }
    );
  });
});
