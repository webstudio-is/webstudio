import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  DesignTokenImportDialog,
  showDesignTokenImportDialog,
} from "./design-token-import-dialog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const renderDialog = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(createElement(DesignTokenImportDialog)));
};

const click = (element: Element | undefined) => {
  if (element === undefined) {
    throw new Error("Expected dialog control");
  }
  act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

const findButton = (label: string) =>
  Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === label
  );

const findRadio = (value: string) =>
  Array.from(document.querySelectorAll('[role="radio"]')).find(
    (radio) => radio.getAttribute("value") === value
  );

test("imports as design tokens by default", async () => {
  const result = showDesignTokenImportDialog();
  renderDialog();
  click(findButton("Import"));

  await expect(result).resolves.toBe("design-token");
});

test("returns the selected CSS variable target", async () => {
  const result = showDesignTokenImportDialog();
  renderDialog();
  click(findRadio("css-variable"));
  click(findButton("Import"));

  await expect(result).resolves.toBe("css-variable");
});

test("cancels without selecting an import target", async () => {
  const result = showDesignTokenImportDialog();
  renderDialog();
  click(findButton("Cancel"));

  await expect(result).resolves.toBe("cancel");
});

test("resets the target when a newer request replaces the open dialog", async () => {
  const first = showDesignTokenImportDialog();
  renderDialog();
  click(findRadio("css-variable"));

  let second!: ReturnType<typeof showDesignTokenImportDialog>;
  act(() => {
    second = showDesignTokenImportDialog();
  });

  await expect(first).resolves.toBe("cancel");
  expect(findRadio("design-token")?.getAttribute("aria-checked")).toBe("true");
  click(findButton("Cancel"));
  await expect(second).resolves.toBe("cancel");
});
