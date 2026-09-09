import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { UnsupportedBrowserDialog } from "./blocking-alerts";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("shows an accessible modal dialog and lets the user continue", () => {
  const onDismiss = vi.fn();

  act(() => {
    root.render(<UnsupportedBrowserDialog onDismiss={onDismiss} />);
  });

  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
  expect(document.body.style.pointerEvents).toBe("none");
  expect(dialog?.textContent).toContain("Unsupported browser");
  expect(dialog?.textContent).toContain("Chromium-based");

  act(() => {
    Array.from(dialog?.querySelectorAll("button") ?? [])
      .find((button) => button.textContent === "Continue")
      ?.click();
  });

  expect(onDismiss).toHaveBeenCalledOnce();
});
