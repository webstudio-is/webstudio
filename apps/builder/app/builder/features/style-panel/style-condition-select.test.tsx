import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { createDefaultPages } from "@webstudio-is/project-build";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  selectInstance,
  $registeredComponentMetas,
  $selectedPageId,
  $selectedStyleSources,
  $selectedStyleState,
} from "~/shared/nano-states";
import {
  $instances,
  $pages,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { StyleConditionSelect } from "./style-condition-select";

registerContainers();

const customSelector = '[data-label="Summer sale"]';

const setupStores = () => {
  const pages = createDefaultPages({ rootInstanceId: "box" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $registeredComponentMetas.set(
    new Map([
      ["Box", { states: [{ label: "Open", selector: '[data-state="open"]' }] }],
    ]) as never
  );
  $instances.set(
    new Map([
      ["box", { type: "instance", id: "box", component: "Box", children: [] }],
    ])
  );
  $styleSources.set(
    new Map([
      ["local", { type: "local", id: "local" }],
      ["unused-token", { type: "token", id: "unused-token", name: "Unused" }],
    ])
  );
  $styleSourceSelections.set(
    new Map([["box", { instanceId: "box", values: ["local"] }]])
  );
  const declarations: StyleDecl[] = [
    {
      styleSourceId: "local",
      breakpointId: "base",
      state: customSelector,
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    // a token the element does not use
    {
      styleSourceId: "unused-token",
      breakpointId: "base",
      state: '[data-label="Winter sale"]',
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ];
  $styles.set(
    new Map(declarations.map((decl) => [getStyleDeclKey(decl), decl]))
  );
  $selectedStyleSources.set(new Map([["box", "local"]]));
  $selectedStyleState.set(undefined);
  selectInstance(["box"]);
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  setupStores();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <TooltipProvider>
        <StyleConditionSelect />
      </TooltipProvider>
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const getTrigger = () => {
  const trigger = container.querySelector<HTMLButtonElement>(
    '[aria-label="Style condition"]'
  );
  if (trigger === null) {
    throw new Error("Expected the condition trigger");
  }
  return trigger;
};

const getMenuItem = (name: string) => {
  const item = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((element) => element.textContent?.includes(name));
  if (item === undefined) {
    throw new Error(`Expected menu item "${name}"`);
  }
  return item;
};

const waitFor = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for the condition menu");
};

const getSearch = () =>
  document.querySelector<HTMLInputElement>(
    'input[aria-label="Search conditions"]'
  );

const openSearch = async () => {
  await userEvent.click(getTrigger());
  await userEvent.click(getMenuItem("More…"));
  await waitFor(() => document.activeElement === getSearch());
};

test("short list keeps None and shows conditions of applied sources only", async () => {
  await userEvent.click(getTrigger());
  expect(getMenuItem("None")).toBeTruthy();
  expect(getMenuItem(customSelector)).toBeTruthy();
  expect(document.body.textContent).not.toContain("Winter sale");
});

test("search finds custom selectors styled on applied sources", async () => {
  await openSearch();
  await userEvent.keyboard("summer");
  expect(getMenuItem(customSelector)).toBeTruthy();
  await userEvent.keyboard("{Enter}");
  expect($selectedStyleState.get()).toBe(customSelector);
});

test("search does not create custom selectors", async () => {
  await openSearch();
  await userEvent.keyboard(":nth-child(2)");
  expect(document.body.textContent).toContain("No matching conditions");
  await userEvent.keyboard("{Enter}");
  expect($selectedStyleState.get()).toBeUndefined();
});

test("arrow keys move between the search input and results", async () => {
  await openSearch();
  await userEvent.keyboard("{ArrowDown}");
  const [firstResult, secondResult] = Array.from(
    getSearch()
      ?.closest('[role="menu"]')
      ?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
  );
  expect(document.activeElement).toBe(firstResult);
  await userEvent.keyboard("{ArrowDown}");
  // the menu moves focus between items asynchronously
  await waitFor(() => document.activeElement === secondResult);
  await userEvent.keyboard("{ArrowUp}");
  await waitFor(() => document.activeElement === firstResult);
  await userEvent.keyboard("{ArrowUp}");
  expect(document.activeElement).toBe(getSearch());
});

test("typing while a result has focus goes to the search", async () => {
  await openSearch();
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard("hov");
  expect(document.activeElement).toBe(getSearch());
  expect(getSearch()?.value).toBe("hov");
});

test("focus returns to the trigger when the menu closes", async () => {
  await openSearch();
  await userEvent.keyboard("{Escape}");
  await waitFor(() => document.activeElement === getTrigger());
  expect(document.activeElement).toBe(getTrigger());
});

test("selecting None returns to base styles", async () => {
  $selectedStyleState.set(customSelector);
  await userEvent.click(getTrigger());
  await userEvent.click(getMenuItem("None"));
  expect($selectedStyleState.get()).toBeUndefined();
});
