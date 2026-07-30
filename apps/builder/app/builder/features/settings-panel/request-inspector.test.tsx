/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
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

const renderInspector = (query: boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <RequestInspector
        queryContainerRef={query ? () => {} : undefined}
        preview={<div>Preview content</div>}
        diagnostics={<div>Diagnostics content</div>}
      />
    );
  });
  return container;
};

test("places an available query editor in the first selected tab", () => {
  const container = renderInspector(true);
  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));

  expect(tabs.map(({ textContent }) => textContent)).toEqual([
    "Query",
    "Preview",
    "Diagnostics",
  ]);
  expect(tabs[0].getAttribute("data-state")).toBe("active");
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
