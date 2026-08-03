/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import { $builderMode } from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { TextContent } from "./text-content";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  $builderMode.set("design");
  $instances.set(
    new Map([
      [
        "reading-time",
        {
          type: "instance",
          id: "reading-time",
          component: "ws:element",
          tag: "span",
          children: [
            { type: "text", value: " · " },
            { type: "expression", value: "1 + 1" },
          ],
        },
      ],
    ])
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  $instances.set(new Map());
});

test("renders the existing bound Text content control for the expression child", () => {
  act(() => {
    root.render(
      <TooltipProvider>
        <TextContent
          instanceId="reading-time"
          meta={{ control: "textContent", type: "string", required: false }}
          prop={undefined}
          propName={textContentAttribute}
          computedValue=" · 2"
          onChange={() => {}}
        />
      </TooltipProvider>
    );
  });

  expect(container.textContent).toContain("Text Content");
  expect(container.querySelector(".cm-content")?.textContent).toBe("2");
  expect(container.querySelector('[data-variant="bound"]')).not.toBeNull();
});
