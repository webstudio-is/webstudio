import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CreateTextFileDialog } from "./create-text-file-dialog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let animationFrames: FrameRequestCallback[];

beforeEach(() => {
  animationFrames = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("focuses the file name after the opening control restores focus", () => {
  act(() => {
    root.render(
      <CreateTextFileDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />
    );
  });

  const input = document.querySelector<HTMLInputElement>(
    "#asset-text-file-name"
  );
  const close = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Close"]'
  );
  if (input === null || close === null) {
    throw new Error("Expected the text file dialog controls");
  }

  close.focus();
  expect(document.activeElement).toBe(close);

  act(() => {
    for (const callback of animationFrames.splice(0)) {
      callback(0);
    }
  });

  expect(document.activeElement).toBe(input);
});

test("focuses the dialog itself when creation is disabled", () => {
  act(() => {
    root.render(
      <CreateTextFileDialog
        open
        disabled
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
      />
    );
  });

  expect(document.activeElement).toBe(
    document.querySelector<HTMLElement>('[role="dialog"]')
  );
  expect(animationFrames).toHaveLength(0);
});
