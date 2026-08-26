/**
 * @vitest-environment jsdom
 */
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { forceLinting, forEachDiagnostic } from "@codemirror/lint";
import { expect, test } from "vitest";
import { getTextFileEditorExtensions } from "./text-file-utils";

test("decorates the exact unsupported MDX source range", async () => {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "# Kept\n\n{danger()}\n",
      extensions: getTextFileEditorExtensions({ format: "mdx" }),
    }),
  });

  forceLinting(view);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const diagnostics: unknown[] = [];
  forEachDiagnostic(view.state, (diagnostic, from, to) => {
    diagnostics.push({ ...diagnostic, from, to });
  });

  expect(diagnostics).toEqual([
    {
      from: 8,
      to: 18,
      severity: "warning",
      message: "Executable MDX expressions are not supported",
    },
  ]);
  view.destroy();
});
