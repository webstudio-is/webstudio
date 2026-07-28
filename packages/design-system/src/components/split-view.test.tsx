import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { SplitView } from "./split-view";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderSplitView = ({
  defaultSize,
}: {
  defaultSize?: { value: number; unit: "%" | "px" };
} = {}) => {
  const container = document.createElement("div");
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
  splitView.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 1000,
    height: 500,
    top: 0,
    right: 1000,
    bottom: 500,
    left: 0,
    toJSON: () => ({}),
  });
  return { separator, splitView };
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

  act(() => {
    for (let index = 0; index < 10; index += 1) {
      separator.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
    }
  });

  expect(separator.getAttribute("aria-valuenow")).toBe("80");
});

test("preserves a proportional split when the container resizes", () => {
  const { splitView } = renderSplitView({
    defaultSize: { value: 40, unit: "%" },
  });

  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0, 0.4fr) 1px minmax(0, 0.6fr)"
  );
});

test("preserves a fixed start pane when the container resizes", () => {
  const { separator, splitView } = renderSplitView({
    defaultSize: { value: 320, unit: "px" },
  });

  expect(splitView.style.gridTemplateColumns).toBe(
    "minmax(0, 320px) 1px minmax(0, 1fr)"
  );

  act(() => {
    separator.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
  });

  expect(separator.getAttribute("aria-valuenow")).toBe("370");
  expect(splitView.style.gridTemplateColumns).toContain("369.95px");
});
