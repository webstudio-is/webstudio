import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ContentParts } from "./text-content";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("renders every mixed content part in order with source, selection, and preview", () => {
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentParts
          instanceId="parent"
          instanceSelector={["parent", "body"]}
          computedValue="Hello worldOleg!"
          parts={[
            { type: "text", childIndex: 0, value: "" },
            {
              type: "instance",
              childIndex: 1,
              instanceId: "strong",
              component: "ws:element",
              label: "Emphasis",
            },
            { type: "expression", childIndex: 2, value: 'name ?? ""' },
            { type: "text", childIndex: 3, value: "!" },
          ]}
        />
      </TooltipProvider>
    );
  });

  const content = container.textContent ?? "";
  expect(content.indexOf("1. Empty text")).toBeLessThan(
    content.indexOf("2. Element: Emphasis")
  );
  expect(content.indexOf("2. Element: Emphasis")).toBeLessThan(
    content.indexOf("3. expression")
  );
  expect(content.indexOf("3. expression")).toBeLessThan(
    content.indexOf("4. text")
  );
  expect(content).toContain('Expression: name ?? ""');
  expect(content).toContain("PreviewHello worldOleg!");
  expect(
    container.querySelector('button[aria-label="Select element Emphasis"]')
  ).not.toBeNull();
  expect(
    container.querySelector('[aria-label="Content preview"]')
  ).not.toBeNull();
});
