import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { EditorState } from "@codemirror/state";
import { CompletionContext } from "@codemirror/autocomplete";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $availableVariables } from "../../shared/model";
import { parseStyleInput } from "~/builder/shared/css-editor/parse-style-input";
import {
  InlineStyleBlockEditor,
  StyleBlockDialog,
  parseBlock,
  cssBlockLanguage,
  blockCompletionSource,
} from "./style-block-dialog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const declarations = Array.from(
  parseStyleInput("margin: 0; border: 1px solid red", new Map()).styleMap,
  ([property, value]) => ({ property, value })
);

const render = (content: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<TooltipProvider>{content}</TooltipProvider>));
  return container;
};

test("inline Code view renders stored longhands as editable shorthands", async () => {
  const container = render(
    <InlineStyleBlockEditor
      declarations={declarations}
      readonly={false}
      onApply={() => {}}
    />
  );
  await vi.waitFor(() => {
    const content = container.querySelector(".cm-content")?.textContent;
    expect(content).toContain("margin:");
    expect(content).toContain("border:");
    expect(content).not.toContain("margin-top:");
  });
});

test("centered Local editor renders stored longhands as editable shorthands", async () => {
  render(
    <StyleBlockDialog
      declarations={declarations}
      readonly={false}
      open
      onOpenChange={() => {}}
      onApply={() => {}}
    />
  );
  await vi.waitFor(() => {
    const content = document.querySelector(".cm-content")?.textContent;
    expect(content).toContain("margin:");
    expect(content).toContain("border:");
  });
});

test("keeps an unknown declaration as a custom property", () => {
  const parsed = parseBlock("bla: 123");
  expect(parsed.styleMap.get("--bla")).toEqual({
    type: "unit",
    unit: "number",
    value: 123,
  });
  expect(parsed.diagnostics).toEqual([]);
});

test("reports a missing separator at the next declaration", () => {
  for (const separator of [" ", "\n"]) {
    const parsed = parseBlock(`color: red${separator}background: blue`);
    expect(parsed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Add a semicolon after the previous declaration.",
        }),
      ])
    );
  }
  expect(parseBlock("color: red;\nbackground: blue").diagnostics).toEqual([]);
});

test("Enter adds a separator before a new declaration line", async () => {
  render(
    <StyleBlockDialog
      declarations={[]}
      readonly={false}
      open
      onOpenChange={() => {}}
      onApply={() => {}}
    />
  );
  const editor = document.querySelector<HTMLElement>(".cm-content");
  expect(editor).not.toBeNull();
  await act(async () => {
    await userEvent.type(editor!, "color: red{Enter}background: blue");
  });
  expect(editor?.textContent).toContain("color: red;");
  expect(editor?.textContent).toContain("background: blue");
  expect(parseBlock(editor?.textContent ?? "").diagnostics).toEqual([]);
});

test.each([
  ["opacity: --", "var(--active-opacity)"],
  ["opacity: var(--", "--active-opacity"],
])("replaces the variable prefix in %s", async (value, label) => {
  vi.spyOn($availableVariables, "get").mockReturnValue([
    { type: "var", value: "active-opacity", fallback: undefined },
  ]);
  const state = EditorState.create({
    doc: value,
    extensions: [cssBlockLanguage],
  });
  const result = await blockCompletionSource(
    new CompletionContext(state, value.length, true)
  );
  expect(result?.from).toBe(value.length - 2);
  expect(result?.options.some((option) => option.label === label)).toBe(true);
  vi.restoreAllMocks();
});
