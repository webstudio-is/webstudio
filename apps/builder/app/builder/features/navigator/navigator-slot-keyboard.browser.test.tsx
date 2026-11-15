import { page, userEvent } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { coreMetas, elementComponent, type Instance } from "@webstudio-is/sdk";
import { subscribeCommands } from "~/builder/shared/commands";
import {
  $registeredComponentMetas,
  $selectedPageId,
  clearInstanceSelection,
  selectInstance,
} from "~/shared/nano-states";
import { expectSlotsShareFragment } from "~/shared/slot-test-utils";
import { $instances, $pages, $project } from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { NavigatorTree } from "./navigator-tree";

const instance = (
  id: string,
  component: string,
  label: string,
  ...children: string[]
): [string, Instance] => [
  id,
  {
    type: "instance",
    id,
    component,
    label,
    children: children.map((value) => ({ type: "id", value })),
  },
];

let container: HTMLDivElement;
let root: Root;
let unsubscribeCommands: () => void;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

registerContainers();

beforeEach(() => {
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
  $pages.set(
    createDefaultPages({ rootInstanceId: "body", homePageId: "home" })
  );
  $selectedPageId.set("home");
  $project.set({ id: "slot-keyboard" } as Project);
  $instances.set(
    new Map([
      instance("body", elementComponent, "Body", "slot-a", "slot-b"),
      instance("slot-a", "Slot", "Slot A", "fragment"),
      instance("slot-b", "Slot", "Slot B", "fragment"),
      instance("fragment", "Fragment", "Shared fragment", "box", "heading"),
      instance("box", elementComponent, "Drop Div"),
      instance("heading", elementComponent, "Slot Heading"),
    ])
  );
  selectInstance(["box", "fragment", "slot-a", "body"]);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <TooltipProvider>
        <NavigatorTree />
      </TooltipProvider>
    )
  );
  unsubscribeCommands = subscribeCommands();
});

afterEach(() => {
  unsubscribeCommands();
  act(() => root.unmount());
  container.remove();
  clearInstanceSelection();
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
  $project.set(undefined);
  $registeredComponentMetas.set(new Map());
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
});

const selectedRows = () =>
  Array.from(
    container.querySelectorAll("[data-tree-button][aria-selected='true']"),
    (button) => button.textContent?.trim()
  );

test("Shift+ArrowDown selects exactly one additional row in the shared Slot", async () => {
  await act(async () =>
    page.getByRole("button", { name: "Drop Div", exact: true }).click()
  );
  expect(selectedRows()).toEqual(["Drop Div"]);

  await act(async () => userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}"));

  expect(selectedRows()).toEqual(["Drop Div", "Slot Heading"]);
  await expect
    .element(page.getByRole("button", { name: "Slot Heading", exact: true }))
    .toHaveFocus();
});

test.each([
  {
    label: "Drop Div",
    key: "ArrowUp",
    remaining: "heading",
    order: ["box", "slot-a", "slot-b"],
  },
  {
    label: "Slot Heading",
    key: "ArrowDown",
    remaining: "box",
    order: ["slot-a", "heading", "slot-b"],
  },
])(
  "Ctrl+$key moves $label out of both Slot occurrences from Navigator focus",
  async ({ label, key, remaining, order }) => {
    await act(async () => {
      await page.getByRole("button", { name: label, exact: true }).click();
      await userEvent.keyboard(`{Control>}{${key}}{/Control}`);
    });

    const instances = $instances.get();
    expectSlotsShareFragment(instances, ["slot-a", "slot-b"]);
    expect(instances.get("body")?.children).toEqual(
      order.map((value) => ({ type: "id", value }))
    );
    expect(instances.get("fragment")?.children).toEqual([
      { type: "id", value: remaining },
    ]);
  }
);
