import { describe, expect, test } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState, type Extension } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import {
  ALLOWED_FILE_TYPES,
  getAssetTextEditorLanguage,
  isTextFileAsset,
} from "@webstudio-is/sdk";
import {
  getTextFileEditorExtensions,
  getTextFileEditorDiagnostics,
  getMdxPersistenceFeedback,
  createMdxCompletionSource,
  isMarkdownAsset,
  normalizeTextFileContent,
  normalizeTextFileConversion,
} from "./text-file-utils";

const getCompletionLabels = async (
  source: ReturnType<typeof createMdxCompletionSource>,
  value: string,
  position = value.length,
  extensions: Extension[] = []
) => {
  const state = EditorState.create({ doc: value, extensions });
  const result = await source(new CompletionContext(state, position, true));
  return result?.options.map(({ label }) => label) ?? [];
};

describe("text file assets", () => {
  test("completes available MDX components, props, and prop values", async () => {
    const source = createMdxCompletionSource([
      {
        name: "Heading",
        props: [{ name: "tag", values: ["h1", "h2"] }, { name: "title" }],
      },
    ]);

    await expect(getCompletionLabels(source, "<He")).resolves.toContain(
      "Heading"
    );
    await expect(getCompletionLabels(source, "<Heading ta")).resolves.toContain(
      "tag"
    );
    await expect(
      getCompletionLabels(source, '<Heading tag="')
    ).resolves.toEqual(expect.arrayContaining(["h1", "h2"]));
    await expect(getCompletionLabels(source, "<Heading cl")).resolves.toEqual(
      expect.arrayContaining(["className"])
    );
    await expect(
      getCompletionLabels(source, "<Heading cl")
    ).resolves.not.toContain("class");
  });

  test("does not offer display labels that are invalid JSX identifiers", async () => {
    const source = createMdxCompletionSource([
      { name: "Heading 1", props: [] },
      { name: "Heading", props: [] },
    ]);

    await expect(getCompletionLabels(source, "<He")).resolves.toEqual(
      expect.arrayContaining(["Heading"])
    );
    await expect(getCompletionLabels(source, "<He")).resolves.not.toContain(
      "Heading 1"
    );
  });

  test("does not complete JSX inside Markdown code", async () => {
    const source = createMdxCompletionSource([
      { name: "Heading", props: [{ name: "tag" }] },
    ]);

    const inlineCode = "`<He`";
    await expect(
      getCompletionLabels(source, inlineCode, inlineCode.length - 1, [
        markdown(),
      ])
    ).resolves.toEqual([]);
    const fencedCode = "```mdx\n<He\n```";
    await expect(
      getCompletionLabels(source, fencedCode, fencedCode.indexOf("\n```"), [
        markdown(),
      ])
    ).resolves.toEqual([]);
  });

  test("detects formats case-insensitively", () => {
    expect(isTextFileAsset({ format: "JSON" })).toBe(true);
    expect(getTextFileEditorExtensions({ format: "JSON" })).toHaveLength(1);
  });

  test("does not open unsupported files", () => {
    expect(isTextFileAsset({ format: "pdf" })).toBe(false);
  });

  test.each(["js", "css", "json", "html", "xml", "svg"])(
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
      expect(getTextFileEditorExtensions({ format }).length > 0).toBe(
        language !== undefined && language !== "plain"
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
      getTextFileEditorDiagnostics({
        source: "# Kept\n\n{danger()}\n",
        format: "mdx",
      })
    ).resolves.toEqual([
      {
        from: 8,
        to: 18,
        severity: "warning",
        source: "unsafe-mdx",
        message: "Executable MDX expressions are not supported",
      },
    ]);
  });

  test("reports every Markdown frontmatter error inline", async () => {
    await expect(
      getTextFileEditorDiagnostics({
        source: "---\na: 1\na: 2\nb: 1\nb: 2\n---\n",
        format: "md",
      })
    ).resolves.toMatchObject([
      { from: 9, to: 10, severity: "warning" },
      { from: 19, to: 20, severity: "warning" },
    ]);
  });

  test("reports unrecoverable MDX without blocking the source", async () => {
    const source = "# Kept\n\n<ws.element";
    const diagnostics = await getTextFileEditorDiagnostics({
      source,
      format: "mdx",
    });
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
      getTextFileEditorDiagnostics({
        source,
        format: "mdx",
        semanticDiagnostics: [
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
        ],
      })
    ).resolves.toEqual([
      {
        from: 27,
        to: 41,
        severity: "warning",
        source: "ignored-template-prop",
        message:
          'Property "class" on template "Card" was ignored because it is incompatible. Line 1, column 28.',
      },
    ]);
  });

  test("reports connected Content Block content-model errors", async () => {
    const source = '<ws.element ws:tag="li">nested item</ws.element>';
    await expect(
      getTextFileEditorDiagnostics({
        source,
        format: "mdx",
        semanticDiagnostics: [
          {
            code: "invalid-mdx",
            severity: "error",
            blockInstanceId: "block",
            assetId: "asset",
            message: "Placing <li> element inside a <li> violates HTML spec.",
            sourceRange: {
              start: { line: 1, column: 1, offset: 0 },
              end: {
                line: 1,
                column: source.length + 1,
                offset: source.length,
              },
            },
          },
        ],
      })
    ).resolves.toEqual([
      {
        from: 0,
        to: source.length,
        severity: "error",
        source: "invalid-mdx",
        message: "Placing <li> element inside a <li> violates HTML spec.",
      },
    ]);
  });

  test("uses the shared contextual validator and keeps every diagnostic", async () => {
    const validateSource = async () => [
      {
        code: "unresolved-template" as const,
        severity: "warning" as const,
        blockInstanceId: "block",
        assetId: "asset",
        templateName: "Card",
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 7, offset: 6 },
        },
      },
      {
        code: "unsafe-mdx" as const,
        severity: "warning" as const,
        blockInstanceId: "block",
        assetId: "asset",
        nodeType: "mdxFlowExpression",
        reason: "Card",
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 7, offset: 6 },
        },
      },
    ];

    await expect(
      getTextFileEditorDiagnostics({
        source: "<Card>",
        format: "mdx",
        validateSource,
      })
    ).resolves.toEqual([
      {
        from: 0,
        to: 6,
        severity: "warning",
        source: "unresolved-template",
        message:
          'Template "Card" is not available and was skipped. Line 1, column 1.',
      },
      {
        from: 0,
        to: 6,
        severity: "warning",
        source: "unsafe-mdx",
        message: "Card",
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
