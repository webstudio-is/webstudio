import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { defaultHighlightStyle, syntaxTree } from "@codemirror/language";
import { highlightTree } from "@lezer/highlight";
import { describe, expect, test } from "vitest";
import { createAssetGraphqlEditor } from "@webstudio-is/asset-resource";
import type { BuilderAssetFieldCatalog } from "@webstudio-is/sdk";
import { getGraphqlExtensions } from "./graphql-code-editor";
import {
  createGraphqlCompletionSource,
  getGraphqlDiagnostics,
  lspSnippetToCodeMirror,
} from "./graphql-editor";

const catalog: BuilderAssetFieldCatalog = {
  format: "webstudio-builder-asset-field-catalog",
  version: 1,
  canonicalRevision: `sha256:${"a".repeat(64)}`,
  documentCount: 1,
  fields: {
    properties: { types: ["object"], occurrences: 1 },
    "properties.title": { types: ["string"], occurrences: 1 },
    "properties.author": { types: ["object"], occurrences: 1 },
    "properties.author.name": { types: ["string"], occurrences: 1 },
  },
};
const editor = createAssetGraphqlEditor(catalog);

describe("GraphQL CodeMirror integration", () => {
  test("highlights and validates against the dynamic Assets schema", () => {
    const query =
      "query Assets { assets { items { id properties { title } } } }";
    const state = EditorState.create({
      doc: query,
      extensions: getGraphqlExtensions(editor),
    });
    const highlightedRanges: Array<{ from: number; to: number }> = [];
    highlightTree(syntaxTree(state), defaultHighlightStyle, (from, to) => {
      highlightedRanges.push({ from, to });
    });

    expect(highlightedRanges.length).toBeGreaterThan(0);
    expect(getGraphqlDiagnostics(state, editor)).toEqual([]);

    const invalid = EditorState.create({
      doc: "{ assets { items { missing } } }",
      extensions: getGraphqlExtensions(editor),
    });
    expect(getGraphqlDiagnostics(invalid, editor)).toEqual([
      expect.objectContaining({
        severity: "error",
        message: expect.stringContaining('Cannot query field "missing"'),
      }),
    ]);
  });

  test("completes dynamic frontmatter fields from the generated schema", () => {
    const state = EditorState.create({
      doc: "{ assets { items { properties { ti } } } }",
    });
    const position = state.doc.toString().lastIndexOf("ti") + 2;
    const result = createGraphqlCompletionSource(editor)(
      new CompletionContext(state, position, true)
    );

    expect(result?.options).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "title" })])
    );
  });

  test("completes arguments, filters, enums, and declared variables", () => {
    const labelsAtCursor = (source: string) => {
      const position = source.indexOf("|");
      const query = source.replace("|", "");
      return editor
        .completions(query, { line: 0, character: position })
        .map(({ label }) => label);
    };

    expect(labelsAtCursor("{ assets(fi|) { items { id } } }")).toContain(
      "first"
    );
    expect(
      labelsAtCursor(
        "{ assets(where: { properties: { ti| } }) { items { id } } }"
      )
    ).toContain("title");
    expect(
      labelsAtCursor(
        "{ assets(first: 1) { items { content(mode: MARK|) { text } } } }"
      )
    ).toContain("MARKDOWN_BODY");
    expect(
      labelsAtCursor(
        "query Posts($title: String!) { assets(where: { properties: { title: { eq: $ti| } } }) { items { id } } }"
      )
    ).toContain("$title");
    const variableQuery =
      "query Posts($title: String!) { assets(where: { properties: { title: { eq: $ti } } }) { items { id } } }";
    expect(
      editor.completions(variableQuery, {
        line: 0,
        character: variableQuery.lastIndexOf("$ti") + 3,
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "$title", insertText: "$title" }),
      ])
    );
  });

  test("formats valid documents and preserves invalid input", () => {
    expect(editor.format("query Posts{assets{items{id}}}")).toBe(`query Posts {
  assets {
    items {
      id
    }
  }
}`);
    expect(editor.format("query {")).toBe("query {");
  });

  test("converts language-server cursor stops to CodeMirror snippets", () => {
    expect(lspSnippetToCodeMirror("where:  {\n   $1\n}")).toBe(
      "where:  {\n   ${1}\n}"
    );
    expect(lspSnippetToCodeMirror("[$12]")).toBe("[${12}]");
  });
});
