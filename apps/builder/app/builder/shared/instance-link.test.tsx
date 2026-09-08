import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { inspectInstance } from "@webstudio-is/project-build/runtime";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import {
  createTemplateComponentFixture,
  renderData,
} from "@webstudio-is/template";
import { $instances, $pages } from "~/shared/sync/data-stores";
import {
  $authToken,
  $builderMode,
  $selectedPageId,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { __testing__ as pageTesting } from "~/shared/pages/use-switch-page";
import { InstanceContextMenu } from "./instance-context-menu";

const { getDeepLinkedInstanceSelection } = pageTesting;
const Body = createTemplateComponentFixture("Body");
const Box = createTemplateComponentFixture("Box");
const Fragment = createTemplateComponentFixture("Fragment");
const Slot = createTemplateComponentFixture("Slot");
const pages = createDefaultPages({
  homePageId: "page",
  rootInstanceId: "body",
});
const { instances } = renderData(
  <Body ws:id="body">
    <Slot ws:id="slot-one">
      <Fragment ws:id="fragment">
        <Box ws:id="target" />
      </Fragment>
    </Slot>
    <Slot ws:id="slot-two">
      <Fragment ws:id="fragment">
        <Box ws:id="target" />
      </Fragment>
    </Slot>
  </Body>
);
const instanceSelector = ["target", "fragment", "slot-two", "body"];

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const originalUrl = window.location.href;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  window.history.replaceState(null, "", originalUrl);
  $authToken.set(undefined);
  $builderMode.set("design");
  selectInstance(undefined);
  $instances.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
});

const openMenu = (selectors: string[][] = [instanceSelector]) => {
  $pages.set(pages);
  $selectedPageId.set("page");
  $instances.set(instances);
  selectInstances(selectors);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <InstanceContextMenu>
        <button>Instance</button>
      </InstanceContextMenu>
    )
  );
  act(() =>
    container
      .querySelector("button")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
  );
  const item = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent === "Copy link to instance");
  expect(item).toBeDefined();
  return item!;
};

test("the context menu writes the selected instance link to the clipboard", async () => {
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  const item = openMenu();
  expect(item.hasAttribute("data-disabled")).toBe(false);
  await act(async () => item.click());
  expect(writeText).toHaveBeenCalledOnce();
  const url = new URL(writeText.mock.calls[0][0]);
  expect(url.origin).toBe(window.location.origin);
  expect(url.searchParams.get("instance")).toBe(instanceSelector.join(","));
  expect(url.searchParams.get("pageId")).toBe("page");
});

test("disables copying one link for a multiple selection", () => {
  expect(
    openMenu([
      ["slot-one", "body"],
      ["slot-two", "body"],
    ]).hasAttribute("data-disabled")
  ).toBe(true);
});

test("disables copying a Global Root link", () => {
  expect(openMenu([[ROOT_INSTANCE_ID]]).hasAttribute("data-disabled")).toBe(
    true
  );
});

test("copies current state and resolves the linked Slot occurrence and MCP target", async () => {
  window.history.replaceState(
    null,
    "",
    "?pageId=old-page&instance=old-target&mode=preview&safemode=true&pageHash=old-anchor#old-anchor"
  );
  $authToken.set("share-token");
  $builderMode.set("content");
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  const item = openMenu();
  await act(async () => item.click());
  expect(writeText).toHaveBeenCalledOnce();
  const url = new URL(writeText.mock.calls[0][0]);
  expect(url.origin).toBe(window.location.origin);
  expect(Object.fromEntries(url.searchParams)).toEqual({
    pageId: "page",
    instance: instanceSelector.join(","),
    authToken: "share-token",
    mode: "content",
    safemode: "true",
  });
  expect(url.hash).toBe("");
  const selector = url.searchParams.get("instance")!.split(",");
  expect(
    getDeepLinkedInstanceSelection({
      instanceSelector: selector,
      canOpenPageTemplates: true,
      pages,
      instances,
    })
  ).toEqual({ pageId: "page", instanceSelector });
  // inspect-instance uses this same runtime implementation. Its instanceId is
  // the first entry, not the full selector or the browser's stale selection.
  expect(
    inspectInstance(
      { instances },
      {
        instanceId: selector[0],
        include: ["children", "ancestors"],
      }
    )
  ).toMatchObject({ id: "target", component: "Box", children: [] });
});

test("copies an explicit Body selection", async () => {
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  const item = openMenu([["body"]]);
  await act(async () => item.click());
  expect(writeText).toHaveBeenCalledOnce();
  const url = new URL(writeText.mock.calls[0][0]);
  expect(url.searchParams.get("instance")).toBe("body");
  expect(url.searchParams.get("pageId")).toBe("page");
});
