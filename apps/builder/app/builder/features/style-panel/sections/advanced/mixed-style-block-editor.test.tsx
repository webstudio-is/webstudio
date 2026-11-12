import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompletionContext } from "@codemirror/autocomplete";
import { getSearchQuery } from "@codemirror/search";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $availableVariables } from "../../shared/model";
import { parseStyleInput } from "~/builder/shared/css-editor/parse-style-input";
import type { ApplyChanges } from "~/builder/shared/css-editor/style-block-parse";
import { MixedStyleBlockEditor } from "./mixed-style-block-editor";
import {
  parseBlock,
  cssBlockLanguage,
  blockCompletionSource,
} from "~/builder/shared/css-editor/style-block-parse";
import { createColorSwatches } from "~/builder/shared/css-editor/style-block-colors";

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

  act(() => {
    container.querySelector("color-input")?.dispatchEvent(new Event("close"));
  });
  await vi.waitFor(() => {
    expect(container.querySelectorAll("color-input")).toHaveLength(0);
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
    picker.dispatchEvent(new Event("close"));
  });
  expect(colorView?.state.doc.toString()).toBe(
    "box-shadow: 0 0 #00ff00; color: blue;"
  );
  expect(container.querySelectorAll("color-input")).toHaveLength(0);
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

test("keeps hidden and uploaded image layers when editing a gradient", async () => {
  const background = parseStyleInput(
    "background-image: url(example.png), linear-gradient(red, blue)",
    new Map()
  ).styleMap.get("background-image");
  if (background?.type !== "layers") {
    throw new Error("Expected layered background");
  }
  const uploaded = {
    type: "image" as const,
    value: { type: "asset" as const, value: "uploaded-image" },
  };
  const hidden = {
    type: "image" as const,
    value: { type: "asset" as const, value: "hidden-image" },
    hidden: true,
  };
  const stored = {
    ...background,
    value: [uploaded, background.value[1], hidden],
  };
  let changes: ApplyChanges | undefined;
  const container = render(
    <MixedStyleBlockEditor
      inline
      declarations={[{ property: "background-image", value: stored }]}
      sourceDeclarations={[]}
      readonly={false}
      onApply={(next) => {
        changes = next;
        return next.newStyles;
      }}
    />
  );
  const view = EditorView.findFromDOM(container.querySelector(".cm-content")!);
  expect(view).not.toBeNull();
  const before = view!.state.doc.toString();
  const from = before.indexOf("red");
  expect(from).toBeGreaterThan(-1);
  act(() => {
    view!.dispatch({ changes: { from, to: from + 3, insert: "green" } });
    view!.contentDOM.focus();
    view!.contentDOM.blur();
  });
  expect(changes?.newStyles.get("background-image")).toEqual({
    ...stored,
    value: [
      uploaded,
      expect.objectContaining({ value: expect.stringContaining("green") }),
      hidden,
    ],
  });
});

const declarations = Array.from(
  parseStyleInput("margin: 0; border: 1px solid red", new Map()).styleMap,
  ([property, value]) => ({ property, value })
);
const sourceDeclarations = [
  {
    property: "background-color" as const,
    source: { name: "remote" as const },
    cascadedValue: { type: "keyword" as const, value: "blue" },
    computedValue: { type: "keyword" as const, value: "blue" },
    usedValue: { type: "keyword" as const, value: "blue" },
  },
];

const render = (content: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<TooltipProvider>{content}</TooltipProvider>));
  return container;
};

test("inline Advanced editor renders stored longhands as editable shorthands", async () => {
  const container = render(
    <MixedStyleBlockEditor
      inline
      declarations={declarations}
      sourceDeclarations={[]}
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
    <MixedStyleBlockEditor
      declarations={declarations}
      sourceDeclarations={[]}
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

test.each(["inline", "centered"])(
  "%s editor explains protected source headings without changing them",
  async (mode) => {
    const props = {
      declarations,
      sourceDeclarations,
      readonly: false,
      onApply: () => {},
    };
    const container = render(
      mode === "inline" ? (
        <MixedStyleBlockEditor {...props} inline />
      ) : (
        <MixedStyleBlockEditor {...props} open onOpenChange={() => {}} />
      )
    );
    const editor = await vi.waitFor(() => {
      const element = (
        mode === "inline" ? container : document
      ).querySelector<HTMLElement>(".cm-content");
      expect(element).not.toBeNull();
      return element!;
    });
    const view = EditorView.findFromDOM(editor)!;
    const before = view.state.doc.toString();
    act(() => {
      view.dispatch({ changes: { from: 0, to: 1 } });
    });
    expect(view.state.doc.toString()).toBe(before);
    await vi.waitFor(() => {
      expect(
        document.querySelector(".cm-mixed-blocked-tooltip")?.textContent
      ).toContain("This heading marks a style source and cannot be changed.");
      expect(document.querySelector("[aria-live]")?.textContent).toContain(
        "This heading marks a style source and cannot be changed."
      );
    });
    const remoteHeading = before.indexOf("/* Cascaded or inherited */");
    act(() => {
      view.dispatch({
        changes: { from: remoteHeading, to: remoteHeading + 1 },
      });
    });
    expect(view.state.doc.toString()).toBe(before);
    expect(
      document.querySelector(".cm-mixed-blocked-tooltip")?.textContent
    ).toContain("This heading marks a style source and cannot be changed.");
    const remoteDeclaration = before.indexOf("background-color:");
    act(() => {
      view.dispatch({
        changes: { from: remoteDeclaration, to: remoteDeclaration + 1 },
      });
    });
    expect(view.state.doc.toString()).toBe(before);
    expect(
      document.querySelector(".cm-mixed-blocked-tooltip")?.textContent
    ).toContain("This declaration comes from another source.");
  }
);

test("centered search finds every source and keeps Local editable", async () => {
  render(
    <MixedStyleBlockEditor
      declarations={Array.from(
        parseStyleInput("color: red", new Map()).styleMap,
        ([property, value]) => ({ property, value })
      )}
      sourceDeclarations={sourceDeclarations}
      readonly={false}
      open
      onOpenChange={() => {}}
      onApply={() => {}}
    />
  );
  const input = document.querySelector<HTMLInputElement>(
    "[data-floating-panel] input[type=text]"
  );
  expect(input).not.toBeNull();
  await act(async () => {
    await userEvent.type(input!, "color");
  });
  const editor = document.querySelector<HTMLElement>(".cm-content")!;
  const view = EditorView.findFromDOM(editor)!;
  expect(getSearchQuery(view.state).search).toBe("color");
  expect(document.querySelectorAll(".cm-style-searchMatch")).toHaveLength(2);
  const firstMatch = view.state.selection.main.from;
  const next = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Next match"]'
  );
  expect(next?.disabled).toBe(false);
  await act(async () => {
    await userEvent.click(next!);
  });
  expect(view.state.selection.main.from).toBeGreaterThan(firstMatch);
  const previous = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Previous match"]'
  );
  await act(async () => {
    await userEvent.click(previous!);
  });
  expect(view.state.selection.main.from).toBe(firstMatch);
  const localValue = view.state.doc.toString().indexOf("red");
  act(() => {
    view.dispatch({
      changes: { from: localValue, to: localValue + 3, insert: "green" },
    });
  });
  expect(view.state.doc.toString()).toContain("green");
});

test("centered search starts empty each time the dialog opens", async () => {
  const dialog = (open: boolean) => (
    <TooltipProvider>
      <MixedStyleBlockEditor
        declarations={declarations}
        sourceDeclarations={sourceDeclarations}
        readonly={false}
        open={open}
        onOpenChange={() => {}}
        onApply={() => {}}
      />
    </TooltipProvider>
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(dialog(true)));
  const input = document.querySelector<HTMLInputElement>(
    "[data-floating-panel] input[type=text]"
  )!;
  await act(async () => {
    await userEvent.type(input, "color");
  });
  expect(input.value).toBe("color");
  act(() => root?.render(dialog(false)));
  act(() => root?.render(dialog(true)));
  const reopenedInput = document.querySelector<HTMLInputElement>(
    "[data-floating-panel] input[type=text]"
  )!;
  expect(reopenedInput.value).toBe("");
  const view = EditorView.findFromDOM(
    document.querySelector<HTMLElement>(".cm-content")!
  )!;
  expect(getSearchQuery(view.state).search).toBe("");
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

test("reports malformed pasted CSS without saving the broken declaration", () => {
  const parsed = parseBlock("color: red }");
  expect(parsed.diagnostics.length).toBeGreaterThan(0);
  expect(parsed.styleMap.has("color")).toBe(false);
});

test("Enter adds a separator before a new declaration line", async () => {
  render(
    <MixedStyleBlockEditor
      declarations={[]}
      sourceDeclarations={[]}
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
    $availableVariables.get(),
    new Map()
  )(new CompletionContext(state, value.length, true));
  expect(result?.from).toBe(value.length - 2);
  expect(result?.options.some((option) => option.label === label)).toBe(true);
  vi.restoreAllMocks();
});
