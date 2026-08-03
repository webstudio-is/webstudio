/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $builderMode } from "~/shared/nano-states";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { TextContent } from "./text-content";
import { getTextContentUpdateOperation } from "./text-content-utils";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

registerContainers();

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  $builderMode.set("design");
  $pages.set(createDefaultPages({ rootInstanceId: "reading-time" }));
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
  expect(container.querySelector('[role="textbox"]')?.textContent).toBe("2");
  expect(container.querySelector('[data-variant="bound"]')).not.toBeNull();
});

test("updates only the targeted expression child", () => {
  const instance = $instances.get().get("reading-time");
  if (instance === undefined) {
    throw new Error("Expected the reading-time instance");
  }
  act(() => {
    executeRuntimeMutation(
      getTextContentUpdateOperation({
        instanceId: instance.id,
        instance,
        type: "expression",
        value: "2 + 2",
      })
    );
  });

  expect($instances.get().get("reading-time")?.children).toEqual([
    { type: "text", value: " · " },
    { type: "expression", value: "2 + 2" },
  ]);
});
