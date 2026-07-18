import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { expect, test, vi } from "vitest";
import {
  clampEditorSelection,
  formatEditorValue,
  formatEditorValueForSync,
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

test("formats the initial editor value", () => {
  expect(
    formatEditorValueForSync({
      value: "unformatted",
      format: (value) => `formatted ${value}`,
      isInitialValue: true,
      hasFocus: true,
    })
  ).toEqual("formatted unformatted");
});

test("formats external updates only while the editor is unfocused", () => {
  const format = (value: string) => `formatted ${value}`;

  expect(
    formatEditorValueForSync({
      value: "unformatted",
      format,
      isInitialValue: false,
      hasFocus: true,
    })
  ).toEqual("unformatted");
  expect(
    formatEditorValueForSync({
      value: "unformatted",
      format,
      isInitialValue: false,
      hasFocus: false,
    })
  ).toEqual("formatted unformatted");
});

test("formats the current document as an editor change", () => {
  const onChange = vi.fn();
  const view = new EditorView({
    doc: "unformatted",
    extensions: [
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
    ],
  });

  expect(formatEditorValue(view, (value) => `formatted ${value}`)).toEqual(
    "formatted unformatted"
  );
  expect(onChange).toHaveBeenCalledWith("formatted unformatted");
  view.destroy();
});
