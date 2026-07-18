import { describe, expect, test } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  defaultHighlightStyle,
  foldable,
  getIndentation,
  syntaxTree,
} from "@codemirror/language";
import { highlightTree } from "@lezer/highlight";
import { getGroqExtensions, getGroqSyntaxDiagnostics } from "./code-editor";

describe("GROQ CodeMirror integration", () => {
  test("parses, highlights, and folds with the Builder CodeMirror packages", () => {
    const query = `
      *[properties.slug == $slug] {
        _id,
        "title": properties.title
      }
    `;
    const state = EditorState.create({
      doc: query,
      extensions: getGroqExtensions(),
    });
    const tree = syntaxTree(state);
    const highlightedRanges: Array<{ from: number; to: number }> = [];

    highlightTree(tree, defaultHighlightStyle, (from, to) => {
      highlightedRanges.push({ from, to });
    });

    expect(tree.length).toBe(query.length);
    expect(tree.toString()).toContain("Projection");
    expect(highlightedRanges.length).toBeGreaterThan(0);

    const projectionLine = state.doc.line(2);
    expect(foldable(state, projectionLine.from, projectionLine.to)).toEqual(
      expect.objectContaining({
        from: expect.any(Number),
        to: expect.any(Number),
      })
    );
    expect(getIndentation(state, state.doc.line(3).from)).toBeGreaterThan(0);
    expect(getGroqSyntaxDiagnostics(state)).toEqual([]);
  });

  test("reports syntax-aware diagnostics for an invalid partial query", () => {
    const state = EditorState.create({
      doc: "*[properties.slug ==",
      extensions: getGroqExtensions(),
    });

    expect(getGroqSyntaxDiagnostics(state)).toEqual([
      expect.objectContaining({
        severity: "error",
        message: "Invalid GROQ syntax",
      }),
    ]);
  });
});
