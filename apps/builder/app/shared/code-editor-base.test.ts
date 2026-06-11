import { EditorSelection } from "@codemirror/state";
import { expect, test } from "vitest";
import { clampEditorSelection } from "./code-editor-base";

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
