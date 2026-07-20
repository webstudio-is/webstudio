import { EditorSelection } from "@codemirror/state";
import { expect, test } from "vitest";
import {
  clampEditorSelection,
  getTemplateInsertion,
  normalizeEditorValue,
} from "./code-editor-base";

test("clampEditorSelection preserves selection within document length", () => {
  const selection = EditorSelection.create([
    EditorSelection.cursor(3),
    EditorSelection.range(6, 8),
  ]);

  const clampedSelection = clampEditorSelection(selection, 10);

  expect(
    clampedSelection.ranges.map((range) => [range.anchor, range.head])
  ).toEqual([
    [3, 3],
    [6, 8],
  ]);
  expect(clampedSelection.mainIndex).toBe(selection.mainIndex);
});

test("clampEditorSelection clamps selection to document length", () => {
  const selection = EditorSelection.create(
    [EditorSelection.range(1, 3), EditorSelection.range(8, 12)],
    1
  );

  const clampedSelection = clampEditorSelection(selection, 5);

  expect(
    clampedSelection.ranges.map((range) => [range.anchor, range.head])
  ).toEqual([
    [1, 3],
    [5, 5],
  ]);
  expect(clampedSelection.mainIndex).toBe(selection.mainIndex);
});

test("normalizeEditorValue defaults undefined to empty string", () => {
  expect(normalizeEditorValue(undefined)).toBe("");
  expect(normalizeEditorValue("value")).toBe("value");
});

test("getTemplateInsertion wraps and selects existing text", () => {
  const insertion = getTemplateInsertion({
    from: 4,
    selectedText: "selected",
    prefix: "**",
    suffix: "**",
    placeholder: "bold text",
  });

  expect(insertion.text).toBe("**selected**");
  expect([insertion.selection.anchor, insertion.selection.head]).toEqual([
    6, 14,
  ]);
});

test("getTemplateInsertion inserts and selects a placeholder", () => {
  const insertion = getTemplateInsertion({
    from: 3,
    selectedText: "",
    prefix: "[",
    suffix: "](https://)",
    placeholder: "link text",
  });

  expect(insertion.text).toBe("[link text](https://)");
  expect([insertion.selection.anchor, insertion.selection.head]).toEqual([
    4, 13,
  ]);
});
