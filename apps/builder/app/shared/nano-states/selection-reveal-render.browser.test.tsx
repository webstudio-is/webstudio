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
import { $instances, $pages } from "../sync/data-stores";
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
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
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
