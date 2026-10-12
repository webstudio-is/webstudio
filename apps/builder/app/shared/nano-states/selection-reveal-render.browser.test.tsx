import { useContext } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  Select,
  Option,
  HeadSlot,
} from "@webstudio-is/sdk-components-react/components";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import { $builderMode } from "./misc";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useStore } from "@nanostores/react";
import { afterEach, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Instance, Instances, WsComponentMeta } from "@webstudio-is/sdk";
import * as radixMetas from "@webstudio-is/sdk-components-react-radix/metas";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@webstudio-is/sdk-components-react-radix";
import { $instances, $pages, $props } from "../sync/data-stores";
import { $selectedPageId } from "./pages";
import { selectInstance } from "./instances";
import { $registeredComponentMetas } from "./components";
import {
  $propValuesByInstanceSelector,
  $propValuesByInstanceSelectorWithMemoryProps,
} from "./props";

const namespace = "@webstudio-is/sdk-components-react-radix:";
const instance = (
  id: string,
  name: string,
  ...children: string[]
): Instance => ({
  type: "instance",
  id,
  component: name,
  children: children.map((value) => ({ type: "id", value })),
});
const outerKey = JSON.stringify(["outer", "page"]);
const innerKey = JSON.stringify([
  "inner",
  "outerContent",
  "outerOverlay",
  "outer",
  "page",
]);
let root: Root | undefined;
let container: HTMLDivElement | undefined;

const Harness = () => {
  const values = useStore($propValuesByInstanceSelectorWithMemoryProps);
  const outerOpen = values.get(outerKey)?.get("open") === true;
  const innerOpen = values.get(innerKey)?.get("open") === true;
  return (
    <Dialog open={outerOpen}>
      <DialogOverlay>
        <DialogContent aria-describedby={undefined}>
          <Dialog open={innerOpen}>
            <DialogOverlay>
              <DialogContent aria-describedby={undefined}>
                <span>Selected portal content</span>
              </DialogContent>
            </DialogOverlay>
          </Dialog>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  selectInstance(undefined);
  $builderMode.set("design");
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $registeredComponentMetas.set(new Map());
  $propValuesByInstanceSelector.set(new Map());
});

test("selection overlay mounts nested closed Dialog portals and clears together", async () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "outer")],
    ["outer", instance("outer", `${namespace}Dialog`, "outerOverlay")],
    [
      "outerOverlay",
      instance("outerOverlay", `${namespace}DialogOverlay`, "outerContent"),
    ],
    [
      "outerContent",
      instance("outerContent", `${namespace}DialogContent`, "inner"),
    ],
    ["inner", instance("inner", `${namespace}Dialog`, "innerOverlay")],
    [
      "innerOverlay",
      instance("innerOverlay", `${namespace}DialogOverlay`, "innerContent"),
    ],
    ["innerContent", instance("innerContent", `${namespace}DialogContent`)],
  ]);
  $instances.set(instances);
  $registeredComponentMetas.set(
    new Map(
      Object.entries(radixMetas).map(([name, meta]) => [
        `${namespace}${name}`,
        meta as WsComponentMeta,
      ])
    )
  );
  const pages = createDefaultPages({
    homePageId: "home",
    rootInstanceId: "page",
  });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $propValuesByInstanceSelector.set(
    new Map([
      [outerKey, new Map([["open", false]])],
      [innerKey, new Map([["open", false]])],
    ])
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
  expect(document.body.textContent).not.toContain("Selected portal content");
  await act(async () =>
    selectInstance([
      "innerContent",
      "innerOverlay",
      "inner",
      "outerContent",
      "outerOverlay",
      "outer",
      "page",
    ])
  );
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(outerKey)
      ?.get("open")
  ).toBe(true);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(innerKey)
      ?.get("open")
  ).toBe(true);
  await expect
    .poll(() => document.body.textContent)
    .toContain("Selected portal content");
  await act(async () => selectInstance(undefined));
  await expect
    .poll(() => document.body.textContent)
    .not.toContain("Selected portal content");
});

const NativeAndHeadHarness = () => {
  const context = useContext(ReactSdkContext);
  const values = useStore($propValuesByInstanceSelectorWithMemoryProps);
  const mode = useStore($builderMode);
  return (
    <ReactSdkContext.Provider
      value={{
        ...context,
        renderer: mode === "preview" ? "preview" : "canvas",
      }}
    >
      <Select
        value={
          values.get(JSON.stringify(["select", "page"]))?.get("value") as string
        }
      >
        <Option value="authored">Original option</Option>
        <Option value="bound">Bound option</Option>
        <Option>Text fallback</Option>
      </Select>
      <HeadSlot
        data-ws-expand={
          values
            .get(JSON.stringify(["head", "page"]))
            ?.get("data-ws-expand") as boolean
        }
      >
        <span>Head content revealed</span>
      </HeadSlot>
    </ReactSdkContext.Provider>
  );
};

test("native select and HeadSlot render the selected content and restore on deselection", async () => {
  const textOption = instance("text", "Option");
  textOption.children = [{ type: "text", value: "Text fallback" }];
  $instances.set(
    new Map([
      ["page", instance("page", "Body", "select", "head")],
      ["select", instance("select", "Select", "bound", "text")],
      ["bound", instance("bound", "Option")],
      ["text", textOption],
      ["head", instance("head", "HeadSlot", "meta")],
      ["meta", instance("meta", "HeadMeta")],
    ])
  );
  $registeredComponentMetas.set(new Map(Object.entries(baseMetas)));
  const pages = createDefaultPages({
    homePageId: "home",
    rootInstanceId: "page",
  });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $props.set(
    new Map([
      [
        "selectValue",
        {
          id: "selectValue",
          instanceId: "select",
          name: "value",
          type: "string",
          value: "authored",
        },
      ],
      [
        "optionValue",
        {
          id: "optionValue",
          instanceId: "bound",
          name: "value",
          type: "string",
          value: "bound",
        },
      ],
      [
        "headExpand",
        {
          id: "headExpand",
          instanceId: "head",
          name: "data-ws-expand",
          type: "boolean",
          value: false,
        },
      ],
    ])
  );
  await expect
    .poll(() =>
      $propValuesByInstanceSelector
        .get()
        .get(JSON.stringify(["bound", "select", "page"]))
        ?.get("value")
    )
    .toBe("bound");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<NativeAndHeadHarness />));
  const selected = () => container?.querySelector("select")?.value;
  await expect.poll(selected).toBe("authored");
  await expect
    .poll(() => container?.textContent)
    .not.toContain("Head content revealed");
  await act(async () => selectInstance(["bound", "select", "page"]));
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(JSON.stringify(["select", "page"]))
      ?.get("value")
  ).toBe("bound");
  await expect.poll(selected).toBe("bound");
  await act(async () => selectInstance(["text", "select", "page"]));
  await expect.poll(selected).toBe("Text fallback");
  await act(async () => selectInstance(["meta", "head", "page"]));
  await expect.poll(selected).toBe("authored");
  await expect
    .poll(() => container?.textContent)
    .toContain("Head content revealed");
  await act(async () => $builderMode.set("preview"));
  await expect
    .poll(() => container?.textContent)
    .not.toContain("Head content revealed");
  await act(async () => $builderMode.set("design"));
  await expect
    .poll(() => container?.textContent)
    .toContain("Head content revealed");
  await act(async () => selectInstance(undefined));
  await expect
    .poll(() => container?.textContent)
    .not.toContain("Head content revealed");
  await expect.poll(selected).toBe("authored");
});
