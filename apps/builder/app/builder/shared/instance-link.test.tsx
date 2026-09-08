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
  $selectedPageId,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { __testing__ as pageTesting } from "~/shared/pages/use-switch-page";
import { InstanceContextMenu, __testing__ } from "./instance-context-menu";

const { getInstanceLink } = __testing__;
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
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  selectInstance(undefined);
  $instances.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
});

test("copies the current selection even before browser URL state catches up", () => {
  const link = getInstanceLink({
    url: "https://p-project.wstd.io/?pageId=old-page&instance=old-target&authToken=share-token&mode=content&pageHash=old-anchor#old-anchor",
    pageId: "page",
    instanceSelector,
  });
  const url = new URL(link!);
  expect(url.origin).toBe("https://p-project.wstd.io");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    pageId: "page",
    instance: instanceSelector.join(","),
    authToken: "share-token",
    mode: "content",
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

test("includes an explicit Body selection and page id", () => {
  const link = getInstanceLink({
    url: "http://localhost:3000/",
    pageId: "page",
    instanceSelector: ["body"],
  });
  expect(new URL(link!).searchParams.get("instance")).toBe("body");
  expect(new URL(link!).searchParams.get("pageId")).toBe("page");
});

test.each([
  { pageId: undefined, instanceSelector },
  { pageId: "page", instanceSelector: undefined },
  { pageId: "page", instanceSelector: [] },
  { pageId: "page", instanceSelector: [ROOT_INSTANCE_ID] },
])("does not create an unresolvable link for %j", (selection) => {
  expect(
    getInstanceLink({ url: "https://p-project.wstd.io/", ...selection })
  ).toBeUndefined();
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
