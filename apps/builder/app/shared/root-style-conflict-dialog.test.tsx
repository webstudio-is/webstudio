import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  RootStyleConflictDialog,
  showRootStyleConflictDialog,
} from "./root-style-conflict-dialog";

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
  act(() => root?.render(createElement(RootStyleConflictDialog)));
};

const conflict = {
  incomingStyle: {
    styleSourceId: "incoming-local",
    breakpointId: "base",
    property: "backgroundColor",
    value: { type: "keyword", value: "red" },
  },
} as const;

test("keeps existing global styles by default", async () => {
  const result = showRootStyleConflictDialog([conflict]);
  renderDialog();

  expect(document.body.textContent).toContain("background-color");
  const continueButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Continue"
  );
  if (continueButton === undefined) {
    throw new Error("Expected global style conflict continue button");
  }
  act(() => {
    continueButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(result).resolves.toBe("ours");
});

test("uses incoming global styles when selected", async () => {
  const result = showRootStyleConflictDialog([conflict]);
  renderDialog();

  const incomingRadio = Array.from(
    document.querySelectorAll('[role="radio"]')
  ).find((radio) => radio.parentElement?.textContent?.includes("Use incoming"));
  if (incomingRadio === undefined) {
    throw new Error("Expected use incoming resolution option");
  }
  act(() => {
    incomingRadio.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const continueButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Continue"
  );
  if (continueButton === undefined) {
    throw new Error("Expected global style conflict continue button");
  }
  act(() => {
    continueButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(result).resolves.toBe("theirs");
});

test("cancels global style conflict resolution", async () => {
  const result = showRootStyleConflictDialog([conflict]);
  renderDialog();

  const cancelButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Cancel"
  );
  if (cancelButton === undefined) {
    throw new Error("Expected global style conflict cancel button");
  }
  act(() => {
    cancelButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(result).resolves.toBe("cancel");
});
