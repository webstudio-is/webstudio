import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import {
  clearSettledDiagnosticsKey,
  RequestInspector,
} from "./request-inspector";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("keeps the current diagnostics request pending when an older one settles", () => {
  expect(clearSettledDiagnosticsKey("resource-b", "resource-a")).toBe(
    "resource-b"
  );
  expect(clearSettledDiagnosticsKey("resource-b", "resource-b")).toBe(
    undefined
  );
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
  expect(queryContainer.current?.style.minHeight).toBe("0px");
  expect(queryContainer.current?.style.minWidth).toBe("0px");
  expect(queryContainer.current?.style.overflow).toBe("hidden");
});

test("loads diagnostics when their tab is opened", () => {
  const onDiagnosticsOpen = vi.fn();
  const container = renderInspector(false, undefined, onDiagnosticsOpen);
  const diagnostics = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find(({ textContent }) => textContent === "Diagnostics");

  act(() => {
    diagnostics?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    diagnostics?.click();
  });

  expect(onDiagnosticsOpen).toHaveBeenCalledOnce();
});

test("shows when diagnostics are loading", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <RequestInspector
        preview={<div>Preview content</div>}
        diagnostics={<div>Partial diagnostics</div>}
        diagnosticsPending
      />
    );
  });
  const diagnostics = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find(({ textContent }) => textContent === "Diagnostics");

  act(() => {
    diagnostics?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    diagnostics?.click();
  });

  expect(
    container.querySelector('[role="status"]')?.getAttribute("aria-label")
  ).toBe("Loading diagnostics…");
  expect(container.textContent).toContain("Partial diagnostics");
  expect(container.textContent).not.toContain("No diagnostics available");
  expect(
    container.querySelector('[data-state="active"][aria-busy="true"]')
  ).not.toBeNull();
});

test("shows when query content is loading", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <RequestInspector
        queryContainerRef={() => {}}
        queryPending
        preview={<div>Preview content</div>}
      />
    );
  });

  expect(
    container.querySelector('[role="status"]')?.getAttribute("aria-label")
  ).toBe("Loading query…");
  expect(
    container.querySelector('[data-state="active"][aria-busy="true"]')
  ).not.toBeNull();
});

test("shows when preview content is loading", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <RequestInspector preview={<div>Previous preview</div>} previewPending />
    );
  });

  expect(
    container.querySelector('[role="status"]')?.getAttribute("aria-label")
  ).toBe("Loading preview…");
  expect(container.textContent).toContain("Previous preview");
  expect(
    container.querySelector('[data-state="active"][aria-busy="true"]')
  ).not.toBeNull();
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
