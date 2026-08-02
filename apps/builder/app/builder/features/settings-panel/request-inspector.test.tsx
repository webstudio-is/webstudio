/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { RequestInspector } from "./request-inspector";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderInspector = (
  query: boolean,
  queryContainerRef: (element: HTMLDivElement | null) => void = () => {},
  onDiagnosticsOpen?: () => void
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <RequestInspector
        queryContainerRef={query ? queryContainerRef : undefined}
        preview={<div>Preview content</div>}
        diagnostics={<div>Diagnostics content</div>}
        onDiagnosticsOpen={onDiagnosticsOpen}
      />
    );
  });
  return container;
};

test("places an available query editor in the first selected tab", () => {
  const queryContainer: { current: HTMLDivElement | null } = { current: null };
  const container = renderInspector(true, (element) => {
    queryContainer.current = element;
  });
  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));

  expect(tabs.map(({ textContent }) => textContent)).toEqual([
    "Query",
    "Preview",
    "Diagnostics",
  ]);
  expect(tabs[0].getAttribute("data-state")).toBe("active");
  expect(queryContainer.current?.style.minHeight).toBe("0");
  expect(queryContainer.current?.style.minWidth).toBe("0");
  expect(queryContainer.current?.style.overflow).toBe("hidden");
});

test("loads diagnostics when their tab is opened", () => {
  const onDiagnosticsOpen = vi.fn();
  const container = renderInspector(false, undefined, onDiagnosticsOpen);
  const diagnostics = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find(({ textContent }) => textContent === "Diagnostics");

  act(() => diagnostics?.click());

  expect(onDiagnosticsOpen).toHaveBeenCalledOnce();
});

test("keeps preview first when no query editor is available", () => {
  const container = renderInspector(false);
  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));

  expect(tabs.map(({ textContent }) => textContent)).toEqual([
    "Preview",
    "Diagnostics",
  ]);
  expect(tabs[0].getAttribute("data-state")).toBe("active");
});
