import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  showTokenConflictDialog,
  TokenConflictDialog,
} from "./token-conflict-dialog";

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

const renderAndCancelDialog = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(createElement(TokenConflictDialog)));
  const cancel = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Cancel"
  );
  if (cancel === undefined) {
    throw new Error("Expected token conflict cancel button");
  }
  act(() => {
    cancel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

test("settles the pending request when the dialog is cancelled", async () => {
  const result = showTokenConflictDialog([{ tokenName: "Primary" }]);
  renderAndCancelDialog();

  await expect(result).resolves.toBe("cancel");
});

test("cancels a pending request when a newer conflict dialog replaces it", async () => {
  const first = showTokenConflictDialog([{ tokenName: "Primary" }]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(createElement(TokenConflictDialog)));
  const staleCancel = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Cancel"
  );
  if (staleCancel === undefined) {
    throw new Error("Expected token conflict cancel button");
  }

  let second!: ReturnType<typeof showTokenConflictDialog>;
  act(() => {
    second = showTokenConflictDialog([{ tokenName: "Secondary" }]);
    staleCancel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(first).resolves.toBe("cancel");
  expect(document.body.textContent).toContain("Secondary");
  const currentCancel = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Cancel"
  );
  if (currentCancel === undefined) {
    throw new Error("Expected replacement token conflict cancel button");
  }
  act(() => {
    currentCancel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(second).resolves.toBe("cancel");
});
