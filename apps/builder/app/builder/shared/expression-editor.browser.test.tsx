import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { EditorView } from "@codemirror/view";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { ExpressionEditor } from "./expression-editor";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement;

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
});

test("Tab accepts the selected completion and preserves other editor keys", async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const variable = encodeDataSourceVariable("example-id");
  const onChange = vi.fn();
  act(() => {
    root?.render(
      <>
        <button>Before</button>
        <ExpressionEditor
          chromeless
          scope={{ [variable]: { alpha: "a", beta: "b" } }}
          aliases={new Map([[variable, "example"]])}
          onChange={onChange}
          onChangeComplete={() => {}}
        />
        <button>After</button>
      </>
    );
  });
  const editor = container.querySelector<HTMLElement>('[role="textbox"]')!;
  const view = EditorView.findFromDOM(editor)!;

  for (const key of ["Tab", "Enter"]) {
    await userEvent.click(editor);
    await userEvent.keyboard("{Control>}{Space}{/Control}");
    await vi.waitFor(() => {
      expect(
        document.querySelector('[role="option"][aria-selected="true"]')
      ).not.toBeNull();
    });
    // CodeMirror ignores completion keys for 75 ms after opening the list.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await userEvent.keyboard(`{${key}}`);
    expect(onChange).toHaveBeenLastCalledWith(variable);
    expect(document.activeElement).toBe(editor);

    // Choose the second property to verify the selected option is inserted.
    await userEvent.keyboard(".");
    await vi.waitFor(() => {
      expect(document.querySelectorAll('[role="option"]').length).toBe(2);
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await userEvent.keyboard(`{ArrowDown}{${key}}`);
    expect(onChange).toHaveBeenLastCalledWith(`${variable}.beta`);
    expect(document.activeElement).toBe(editor);

    await userEvent.keyboard("{ControlOrMeta>}a{/ControlOrMeta}{Backspace}");
    expect(view.state.doc.toString()).toBe("");
  }

  // With no completion, Tab indents and Shift-Tab removes that indentation.
  await userEvent.keyboard("1{Tab}");
  expect(view.state.doc.toString()).toBe("  1");
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  expect(view.state.doc.toString()).toBe("1");
  expect(document.activeElement).toBe(editor);

  await userEvent.keyboard("{Escape}{Tab}");
  expect(document.activeElement).toBe(container.querySelectorAll("button")[1]);
  await userEvent.click(editor);
  await userEvent.keyboard("{Escape}{Shift>}{Tab}{/Shift}");
  expect(document.activeElement).toBe(container.querySelector("button"));
  expect(view.state.doc.toString()).toBe("1");
});
