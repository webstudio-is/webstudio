import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test } from "vitest";
import { SplitView } from "./split-view";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const originalResizeObserver = globalThis.ResizeObserver;
const resizeObservers = new Set<TestResizeObserver>();

class TestResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObservers.add(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {
    resizeObservers.delete(this);
  }
  notify() {
    this.callback([], this);
  }
}

beforeEach(() => {
  globalThis.ResizeObserver = TestResizeObserver;
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  resizeObservers.clear();
  globalThis.ResizeObserver = originalResizeObserver;
  document.body.innerHTML = "";
});

const renderSplitView = ({
  defaultSize,
}: {
  defaultSize?: { value: number; unit: "%" | "px" };
} = {}) => {
  const container = document.createElement("div");
  container.style.width = "1000px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <SplitView
        start="Start"
        end="End"
        separatorLabel="Resize panels"
        defaultSize={defaultSize}
      />
    );
  });
  const separator = container.querySelector('[role="separator"]');
  if (!(separator instanceof HTMLElement)) {
    throw new Error("Expected split view separator");
  }
  const splitView = separator.parentElement;
  if (splitView === null) {
    throw new Error("Expected split view container");
  }
  const resize = (nextWidth: number) => {
    container.style.width = `${nextWidth}px`;
    act(() => {
      for (const observer of resizeObservers) {
        observer.notify();
      }
    });
  };
  return { separator, splitView, resize };
};

test("resizes panels with the keyboard", () => {
  const { separator } = renderSplitView();

  act(() => {
    separator.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
  });

  expect(separator.getAttribute("aria-valuenow")).toBe("55");
});

test("keeps keyboard resizing within the configured ratios", () => {
  const { separator } = renderSplitView();

  for (let index = 0; index < 10; index += 1) {
    act(() => {
      separator.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
    });
  }

  expect(separator.getAttribute("aria-valuenow")).toBe("80");
});

test("preserves a proportional split when the container resizes", () => {
  const { splitView } = renderSplitView({
    defaultSize: { value: 40, unit: "%" },
  });

  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0px, 399.6px) 1px minmax(0px, 1fr)"
  );
});

test("preserves a fixed start pane when the container resizes", () => {
  const { separator, splitView } = renderSplitView({
    defaultSize: { value: 320, unit: "px" },
  });

  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0px, 320px) 1px minmax(0px, 1fr)"
  );

  act(() => {
    separator.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
  });

  expect(separator.getAttribute("aria-valuenow")).toBe("370");
  expect(splitView.style.gridTemplateColumns).toContain("369.95px");
});

test("clamps a fixed split on container resize and restores its desired size", () => {
  const { separator, splitView, resize } = renderSplitView({
    defaultSize: { value: 320, unit: "px" },
  });

  resize(400);
  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0px, 239px) 1px minmax(0px, 1fr)"
  );
  expect(separator.getAttribute("aria-valuemin")).toBe("160");
  expect(separator.getAttribute("aria-valuemax")).toBe("239");

  resize(1000);
  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0px, 320px) 1px minmax(0px, 1fr)"
  );
});

test("clamps a percentage split on container resize and restores its ratio", () => {
  const { splitView, resize } = renderSplitView({
    defaultSize: { value: 40, unit: "%" },
  });

  resize(400);
  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0px, 160px) 1px minmax(0px, 1fr)"
  );

  resize(1000);
  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0px, 399.6px) 1px minmax(0px, 1fr)"
  );
});
