import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { blockComponent, coreMetas } from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  $builderMode,
  $registeredComponentMetas,
  $selectedPageId,
} from "~/shared/nano-states";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { NavigatorTree } from "./navigator-tree";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const previousMetas = $registeredComponentMetas.get();

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  $builderMode.set("design");
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
  $registeredComponentMetas.set(previousMetas);
});

test("explains an empty Content mode Navigator only for a selected page", () => {
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
  $pages.set(
    createDefaultPages({ rootInstanceId: "body", homePageId: "home" })
  );
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [],
        },
      ],
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [],
        },
      ],
    ])
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    $builderMode.set("content");
    root?.render(
      <TooltipProvider>
        <NavigatorTree />
      </TooltipProvider>
    );
  });
  expect(container.querySelector('[role="status"]')).toBeNull();

  act(() => $selectedPageId.set("home"));
  expect(container.querySelector('[role="status"]')?.textContent).toBe(
    "This page has no editable content. To make areas editable in content mode, wrap them in a Content block component in design mode."
  );

  act(() => {
    $instances.set(
      new Map([
        [
          "body",
          {
            ...$instances.get().get("body")!,
            children: [{ type: "id", value: "block" }],
          },
        ],
        ["block", $instances.get().get("block")!],
      ])
    );
  });
  expect(container.querySelector('[role="status"]')).toBeNull();

  act(() => $builderMode.set("design"));
  expect(container.querySelector('[role="status"]')).toBeNull();

  act(() => {
    const instances = new Map($instances.get());
    instances.set("body", { ...instances.get("body")!, children: [] });
    $instances.set(instances);
  });
  expect(container.querySelector('[role="status"]')).toBeNull();
});
