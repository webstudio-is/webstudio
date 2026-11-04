import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
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
import { createColorSwatches } from "./style-block-colors";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let colorView: EditorView | undefined;

afterEach(() => {
  colorView?.destroy();
  colorView = undefined;
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("shows swatches only for color values and mounts one picker on demand", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const doc = [
    "font-family: red;",
    "animation-name: blue;",
    "color: red;",
    "background: linear-gradient(red, blue);",
    "box-shadow: 0 0 #000;",
    "--brand: #fff;",
  ].join("\n");
  act(() => {
    colorView = new EditorView({
      parent: container,
      state: EditorState.create({
        doc,
        extensions: [cssBlockLanguage, createColorSwatches(() => {})],
      }),
    });
  });
  await vi.waitFor(() => {
    expect(container.querySelectorAll("button[aria-label]")).toHaveLength(5);
  });
  const lines = container.querySelectorAll(".cm-line");
  expect(lines[0].querySelector("button")).toBeNull();
  expect(lines[1].querySelector("button")).toBeNull();
  expect(lines[2].querySelector("button")).not.toBeNull();
  expect(container.querySelectorAll("color-input")).toHaveLength(0);

  await act(async () => {
    await userEvent.click(container.querySelectorAll("button[aria-label]")[0]);
  });
  await vi.waitFor(() => {
    expect(container.querySelectorAll("color-input")).toHaveLength(1);
  });

  await act(async () => {
    await userEvent.click(container.querySelectorAll("button[aria-label]")[1]);
  });
  await vi.waitFor(() => {
    expect(container.querySelectorAll("color-input")).toHaveLength(1);
  });
});

test("the picker replaces only its color token", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onComplete = vi.fn();
  act(() => {
    colorView = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: "box-shadow: 0 0 red; color: blue;",
        extensions: [cssBlockLanguage, createColorSwatches(onComplete)],
      }),
    });
  });
  await vi.waitFor(() => {
    expect(container.querySelectorAll("button[aria-label]")).toHaveLength(2);
  });
  await act(async () => {
    await userEvent.click(container.querySelector("button[aria-label]")!);
  });
  const picker = await vi.waitFor(() => {
    const element = container.querySelector("color-input");
    expect(element).not.toBeNull();
    return element!;
  });
  act(() => {
    picker.dispatchEvent(new Event("open"));
    picker.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: "#00ff00", colorspace: "hex" },
      })
    );
    document.dispatchEvent(new Event("pointerup"));
  });
  expect(colorView?.state.doc.toString()).toBe(
    "box-shadow: 0 0 rgb(0 255 0 / 1); color: blue;"
  );
  expect(container.querySelectorAll("color-input")).toHaveLength(1);
  expect(onComplete).toHaveBeenCalledOnce();
});

test("read-only blocks show color thumbs without opening a picker", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    colorView = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: "color: red;",
        extensions: [
          cssBlockLanguage,
          EditorState.readOnly.of(true),
          createColorSwatches(() => {}),
        ],
      }),
    });
  });
  await vi.waitFor(() => {
    expect(container.querySelectorAll("span[aria-label]")).toHaveLength(1);
  });
  expect(
    container.querySelectorAll("button[aria-label], color-input")
  ).toHaveLength(0);
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
