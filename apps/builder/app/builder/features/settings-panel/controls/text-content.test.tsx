import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { TooltipProvider } from "@webstudio-is/design-system";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import type { Instance } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $builderMode } from "~/shared/nano-states";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { TextContent } from "./text-content";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

registerContainers();

let container: HTMLDivElement;
let root: Root;
const rangeGetClientRects = Object.getOwnPropertyDescriptor(
  Range.prototype,
  "getClientRects"
);

const setReadingTimeChildren = (children: Instance["children"]) => {
  $instances.set(
    new Map([
      [
        "reading-time",
        {
          type: "instance" as const,
          id: "reading-time",
          component: "ws:element",
          tag: "span",
          children,
        },
      ],
    ])
  );
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  $builderMode.set("design");
  $pages.set(createDefaultPages({ rootInstanceId: "reading-time" }));
  setReadingTimeChildren([
    { type: "text", value: " · " },
    { type: "expression", value: "1 + 1" },
  ]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  $instances.set(new Map());
  vi.unstubAllGlobals();
  if (rangeGetClientRects === undefined) {
    delete (Range.prototype as { getClientRects?: unknown }).getClientRects;
  } else {
    Object.defineProperty(
      Range.prototype,
      "getClientRects",
      rangeGetClientRects
    );
  }
});

const renderTextContent = (computedValue = " · 2") => {
  act(() => {
    root.render(
      <TooltipProvider>
        <TextContent
          instanceId="reading-time"
          meta={{ control: "textContent", type: "string", required: false }}
          prop={undefined}
          propName={textContentAttribute}
          computedValue={computedValue}
          onChange={() => {}}
        />
      </TooltipProvider>
    );
  });
};

const openBindingPopover = async () => {
  const trigger = container.querySelector<HTMLButtonElement>(
    'button[data-variant="bound"]'
  );
  if (trigger === null) {
    throw new Error("Expected the bound expression trigger");
  }
  await act(async () => {
    trigger.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  });
};

const getResetBindingButton = () => {
  const button = document.querySelector<HTMLButtonElement>(
    '[aria-label="Reset binding"]'
  );
  if (button === null) {
    throw new Error("Expected the reset binding button");
  }
  return button;
};

test("renders the existing bound Text content control for the expression child", () => {
  renderTextContent();

  expect(container.textContent).toContain("Text Content");
  expect(container.querySelector('[role="textbox"]')?.textContent).toBe("2");
  expect(container.querySelector('[data-variant="bound"]')).not.toBeNull();
});

test("updates only the targeted expression child through the binding editor", async () => {
  renderTextContent();
  await openBindingPopover();

  const editorElement = document.querySelector<HTMLElement>(
    '[role="dialog"] [role="textbox"]'
  );
  if (editorElement === null) {
    throw new Error("Expected the expression editor");
  }
  const view = EditorView.findFromDOM(editorElement);
  if (view === null) {
    throw new Error("Expected the CodeMirror view");
  }

  act(() => {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: "2 + 2",
      },
    });
  });
  act(() => {
    view.focus();
    view.contentDOM.blur();
  });

  expect($instances.get().get("reading-time")?.children).toEqual([
    { type: "text", value: " · " },
    { type: "expression", value: "2 + 2", mode: "read" },
  ]);
});

test("resets a mixed expression without replacing its text sibling", async () => {
  setReadingTimeChildren([
    { type: "text", value: " · " },
    { type: "expression", value: '"test"' },
  ]);
  renderTextContent(" · test");
  await openBindingPopover();

  const resetButton = getResetBindingButton();
  expect(resetButton.disabled).toBe(false);
  act(() => resetButton.click());

  expect($instances.get().get("reading-time")?.children).toEqual([
    { type: "text", value: " · test" },
  ]);
});

test("resets and consolidates every expression on the instance", async () => {
  setReadingTimeChildren([
    { type: "text", value: "A" },
    { type: "expression", value: '"B"' },
    { type: "expression", value: '"C"' },
    { type: "text", value: "D" },
  ]);
  renderTextContent("ABCD");
  await openBindingPopover();

  const resetButton = getResetBindingButton();
  expect(resetButton.disabled).toBe(false);
  act(() => resetButton.click());

  expect($instances.get().get("reading-time")?.children).toEqual([
    { type: "text", value: "ABCD" },
  ]);
});

test("resets a sole expression to its evaluated text value", async () => {
  setReadingTimeChildren([{ type: "expression", value: "1 + 1" }]);
  renderTextContent("2");
  await openBindingPopover();

  const resetButton = getResetBindingButton();
  expect(resetButton.disabled).toBe(false);
  act(() => resetButton.click());

  expect($instances.get().get("reading-time")?.children).toEqual([
    { type: "text", value: "2" },
  ]);
});
