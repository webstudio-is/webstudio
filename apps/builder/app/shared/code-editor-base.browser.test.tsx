import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cssVar } from "@webstudio-is/design-system";
import "@webstudio-is/design-system/global.css";
import { EditorContent } from "./code-editor-base";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const rangeGetClientRects = Object.getOwnPropertyDescriptor(
  Range.prototype,
  "getClientRects"
);

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [new DOMRect(0, 0, 20, 16)],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.removeAttribute("data-color-scheme");
  vi.unstubAllGlobals();
  if (rangeGetClientRects === undefined) {
    delete (Range.prototype as { getClientRects?: unknown }).getClientRects;
  } else {
    Object.defineProperty(
      Range.prototype,
      "getClientRects",
      rangeGetClientRects
    );
  }
});

test.each(["light", "dark"] as const)(
  "uses the shared selection color in %s mode",
  async (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    act(() => {
      root.render(
        <EditorContent
          value="selected text"
          onChange={() => {}}
          onChangeComplete={() => {}}
        />
      );
    });

    const editor = container.querySelector<HTMLElement>('[role="textbox"]');
    if (editor === null) {
      throw new Error("Expected the code editor");
    }
    const view = EditorView.findFromDOM(editor);
    if (view === null) {
      throw new Error("Expected the CodeMirror view");
    }
    act(() => {
      view.dispatch({
        selection: EditorSelection.range(0, view.state.doc.length),
      });
      view.focus();
    });
    await act(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );

    const selection = container.querySelector<HTMLElement>(
      ".cm-selectionBackground"
    );
    if (selection === null) {
      throw new Error("Expected a rendered selection");
    }
    const reference = document.createElement("span");
    reference.style.background = cssVar("--background-text-selection");
    reference.style.color = "var(--foreground-on-text-selection)";
    document.body.appendChild(reference);

    const selectionColor = getComputedStyle(selection).backgroundColor;
    const referenceColor = getComputedStyle(reference).backgroundColor;
    const content = container.querySelector<HTMLElement>(".cm-content");
    if (content === null) {
      throw new Error("Expected editor content");
    }
    const selectedTextColor = getComputedStyle(content, "::selection").color;
    const referenceTextColor = getComputedStyle(reference).color;
    reference.remove();
    expect(selectionColor).toBe(referenceColor);
    expect(selectedTextColor).toBe(referenceTextColor);
  }
);

test("scopes disabled styles to the Webstudio code editor", () => {
  act(() => {
    root.render(
      <fieldset disabled>
        <EditorContent
          value="disabled editor"
          onChange={() => {}}
          onChangeComplete={() => {}}
        />
        <div className="cm-editor" data-foreign-editor />
      </fieldset>
    );
  });

  const editors = container.querySelectorAll<HTMLElement>(".cm-editor");
  const foreignEditor = container.querySelector<HTMLElement>(
    "[data-foreign-editor]"
  );
  if (editors[0] === undefined || foreignEditor === null) {
    throw new Error("Expected both code editors");
  }

  expect(getComputedStyle(editors[0]).opacity).toBe("0.3");
  expect(getComputedStyle(foreignEditor).opacity).toBe("1");
});
