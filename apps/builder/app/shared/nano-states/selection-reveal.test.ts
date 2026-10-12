import { afterEach, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { canvasComponentLibraries } from "@webstudio-is/sdk-components-registry/canvas";
import {
  getIndexesWithinAncestors,
  type Instance,
  type Instances,
  type Prop,
  type WsComponentMeta,
  collectionComponent,
} from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import { $dataSources, $instances, $pages, $props } from "../sync/data-stores";
import { $selectedPageId } from "./pages";
import { selectInstance } from "./instances";
import { $memoryProps, $builderMode } from "./misc";
import { $registeredComponentMetas } from "./components";
import { $dataSourceVariables } from "./variables";
import {
  $propValuesByInstanceSelector,
  $propValuesByInstanceSelectorWithMemoryProps,
  $selectionOverrides,
} from "./props";
import { getSelectionOverrides } from "./selection-reveal";

const radix = "@webstudio-is/sdk-components-react-radix:";
const component = (name: string) => `${radix}${name}`;
const metas = new Map<string, WsComponentMeta>();
for (const library of canvasComponentLibraries) {
  const prefix = "namespace" in library ? `${library.namespace}:` : "";
  for (const [name, meta] of Object.entries(library.metas)) {
    metas.set(`${prefix}${name}`, meta);
  }
}
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
const key = (...selector: string[]) => JSON.stringify(selector);
const values = (entries: Array<[string[], Record<string, unknown>]>) =>
  new Map(
    entries.map(([selector, props]) => [
      key(...selector),
      new Map(Object.entries(props)),
    ])
  );
const resolve = (
  instances: Instances,
  selectedSelector: string[] | undefined,
  props = values([])
) =>
  getSelectionOverrides({
    instances,
    selectedSelector,
    rootInstanceId: "page",
    metas,
    propValues: props,
    indexesWithinAncestors: getIndexesWithinAncestors(metas, instances, [
      "page",
    ]),
  });

const setupPage = (instances: Instances) => {
  $instances.set(instances);
  $registeredComponentMetas.set(metas);
  const pages = createDefaultPages({
    homePageId: "home",
    rootInstanceId: "page",
  });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
};

afterEach(() => {
  selectInstance(undefined);
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $dataSources.set(new Map());
  $dataSourceVariables.set(new Map());
  $propValuesByInstanceSelector.set(new Map());
  $memoryProps.set(new Map());
  $registeredComponentMetas.set(new Map());
  $builderMode.set("design");
});

test("actual registry rules open the nearest owning Radix roots", () => {
  for (const [root, content] of [
    ["Dialog", "DialogContent"],
    ["Dialog", "DialogOverlay"],
    ["Popover", "PopoverContent"],
    ["Tooltip", "TooltipContent"],
    ["Select", "SelectContent"],
    ["Collapsible", "CollapsibleContent"],
  ]) {
    const instances: Instances = new Map([
      ["page", instance("page", "Body", "outer")],
      ["outer", instance("outer", component(root), "inner")],
      ["inner", instance("inner", component(root), "content")],
      ["content", instance("content", component(content), "child")],
      ["child", instance("child", "Box")],
    ]);
    const result = resolve(instances, [
      "child",
      "content",
      "inner",
      "outer",
      "page",
    ]);
    expect(result.get(key("inner", "outer", "page"))?.get("open")).toBe(true);
    expect(result.get(key("outer", "page"))?.get("open")).toBeUndefined();
  }
});

test("removed Collection occurrence cannot reveal a stale portal owner", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "dialog")],
    ["dialog", instance("dialog", component("Dialog"), "collection")],
    ["collection", instance("collection", collectionComponent, "content")],
    ["content", instance("content", component("DialogContent"))],
  ]);
  const selector = ["content", "collection[1]", "collection", "dialog", "page"];
  const liveValues = values([[selector, {}]]);
  expect(
    resolve(instances, selector, liveValues)
      .get(key("dialog", "page"))
      ?.get("open")
  ).toBe(true);
  expect(resolve(instances, selector).size).toBe(0);
  expect(
    resolve(
      instances,
      ["content", "junk", "collection", "dialog", "page"],
      liveValues
    ).size
  ).toBe(0);
});

test("two live Collection occurrences keep their resolved tab values isolated", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "collection")],
    ["collection", instance("collection", collectionComponent, "tabs")],
    ["tabs", instance("tabs", component("Tabs"), "content")],
    ["content", instance("content", component("TabsContent"))],
  ]);
  const first = ["content", "tabs", "collection[0]", "collection", "page"];
  const second = ["content", "tabs", "collection[1]", "collection", "page"];
  const resolved = values([
    [first, { value: "first bound item" }],
    [second, { value: "second bound item" }],
  ]);
  const firstOverrides = resolve(instances, first, resolved);
  expect(
    firstOverrides
      .get(key("tabs", "collection[0]", "collection", "page"))
      ?.get("value")
  ).toBe("first bound item");
  expect(
    firstOverrides.has(key("tabs", "collection[1]", "collection", "page"))
  ).toBe(false);
  const secondOverrides = resolve(instances, second, resolved);
  expect(
    secondOverrides
      .get(key("tabs", "collection[1]", "collection", "page"))
      ?.get("value")
  ).toBe("second bound item");
  expect(
    secondOverrides.has(key("tabs", "collection[0]", "collection", "page"))
  ).toBe(false);
});

test("Tabs trigger and content use bound or index values, including empty string", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "tabs")],
    [
      "tabs",
      instance("tabs", component("Tabs"), "list", "content0", "content1"),
    ],
    ["list", instance("list", component("TabsList"), "trigger")],
    ["trigger", instance("trigger", component("TabsTrigger"))],
    ["content0", instance("content0", component("TabsContent"))],
    ["content1", instance("content1", component("TabsContent"))],
  ]);
  const bound = values([
    [["trigger", "list", "tabs", "page"], { value: "bound" }],
    [["content1", "tabs", "page"], { value: "" }],
  ]);
  expect(
    resolve(instances, ["trigger", "list", "tabs", "page"], bound)
      .get(key("tabs", "page"))
      ?.get("value")
  ).toBe("bound");
  expect(
    resolve(instances, ["content1", "tabs", "page"], bound)
      .get(key("tabs", "page"))
      ?.get("value")
  ).toBe("");
  bound.set(key("content1", "tabs", "page"), new Map([["value", 0]]));
  expect(
    resolve(instances, ["content1", "tabs", "page"], bound)
      .get(key("tabs", "page"))
      ?.get("value")
  ).toBe(0);
  expect(
    resolve(instances, ["content1", "tabs", "page"])
      .get(key("tabs", "page"))
      ?.get("value")
  ).toBe("1");
});

test("Accordion and Navigation Menu read their containing item within the nearest owner", () => {
  for (const [root, item, content] of [
    ["Accordion", "AccordionItem", "AccordionContent"],
    ["NavigationMenu", "NavigationMenuItem", "NavigationMenuContent"],
  ]) {
    const instances: Instances = new Map([
      ["page", instance("page", "Body", "outer")],
      ["outer", instance("outer", component(root), "outerItem")],
      ["outerItem", instance("outerItem", component(item), "inner")],
      ["inner", instance("inner", component(root), "item0", "item1")],
      ["item0", instance("item0", component(item))],
      ["item1", instance("item1", component(item), "content")],
      ["content", instance("content", component(content))],
    ]);
    const selector = [
      "content",
      "item1",
      "inner",
      "outerItem",
      "outer",
      "page",
    ];
    const explicit = values([
      [["item1", "inner", "outerItem", "outer", "page"], { value: "chosen" }],
    ]);
    expect(
      resolve(instances, selector, explicit)
        .get(key("inner", "outerItem", "outer", "page"))
        ?.get("value")
    ).toBe("chosen");
    expect(
      resolve(instances, selector)
        .get(key("inner", "outerItem", "outer", "page"))
        ?.get("value")
    ).toBe("1");
    expect(
      resolve(instances, selector).get(key("outer", "page"))?.get("value")
    ).toBeUndefined();
  }
});

test("an item outside the nearest owner cannot provide its value", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "outer")],
    ["outer", instance("outer", component("Accordion"), "outerItem")],
    ["outerItem", instance("outerItem", component("AccordionItem"), "inner")],
    ["inner", instance("inner", component("Accordion"), "content")],
    ["content", instance("content", component("AccordionContent"))],
  ]);
  const result = resolve(instances, [
    "content",
    "inner",
    "outerItem",
    "outer",
    "page",
  ]);
  expect(
    result.get(key("inner", "outerItem", "outer", "page"))?.get("value")
  ).toBeUndefined();
});

test("hidden selected path uses occurrence keys and invalid paths clear atomically", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "left", "right")],
    ["left", instance("left", "Form", "feedback")],
    ["right", instance("right", "Form", "feedback")],
    ["feedback", instance("feedback", "Box")],
  ]);
  const props = values([
    [["feedback", "left", "page"], { [showAttribute]: false }],
    [["feedback", "right", "page"], { [showAttribute]: false }],
    [["left", "page"], { [showAttribute]: false }],
  ]);
  const selected = resolve(instances, ["feedback", "left", "page"], props);
  expect(
    selected.get(key("feedback", "left", "page"))?.get(showAttribute)
  ).toBe(true);
  expect(selected.get(key("left", "page"))?.get(showAttribute)).toBe(true);
  expect(selected.has(key("feedback", "right", "page"))).toBe(false);
  expect(resolve(instances, undefined, props).size).toBe(0);
  expect(resolve(instances, ["feedback", "other", "page"], props).size).toBe(0);
  expect(
    resolve(instances, ["feedback", "left", "other-page"], props).size
  ).toBe(0);
  instances.set("left", instance("left", "Form"));
  expect(resolve(instances, ["feedback", "left", "page"], props).size).toBe(0);
});

test("selection layer composes after unrelated memory props and Preview ignores it", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "dialog")],
    ["dialog", instance("dialog", component("Dialog"), "content")],
    ["content", instance("content", component("DialogContent"))],
  ]);
  setupPage(instances);
  $propValuesByInstanceSelector.set(
    values([[["dialog", "page"], { open: false, title: "authored" }]])
  );
  $memoryProps.set(
    new Map<string, Map<string, Prop>>([
      [
        key("dialog", "page"),
        new Map([
          [
            "title",
            {
              id: "memory-title",
              instanceId: "dialog",
              name: "title",
              type: "string",
              value: "interaction",
            },
          ],
          [
            "open",
            {
              id: "memory-open",
              instanceId: "dialog",
              name: "open",
              type: "boolean",
              value: false,
            },
          ],
        ]),
      ],
    ])
  );
  selectInstance(["content", "dialog", "page"]);
  expect(
    $selectionOverrides.get().get(key("dialog", "page"))?.get("open")
  ).toBe(true);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("dialog", "page"))
  ).toEqual(
    new Map<string, unknown>([
      ["open", true],
      ["title", "interaction"],
    ])
  );
  $builderMode.set("preview");
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("dialog", "page"))
      ?.get("open")
  ).toBe(false);
  $registeredComponentMetas.set(
    new Map([...metas].filter(([name]) => name !== component("DialogContent")))
  );
  expect(
    $selectionOverrides.get().get(key("dialog", "page"))?.has("open")
  ).not.toBe(true);
  $registeredComponentMetas.set(metas);
  expect(
    $selectionOverrides.get().get(key("dialog", "page"))?.get("open")
  ).toBe(true);
  $memoryProps.set(
    new Map([
      [
        key("dialog", "page"),
        new Map<string, Prop>([
          [
            "title",
            {
              id: "latest",
              instanceId: "dialog",
              name: "title",
              type: "string",
              value: "latest interaction",
            },
          ],
        ]),
      ],
    ])
  );
  $builderMode.set("design");
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("dialog", "page"))
      ?.get("title")
  ).toBe("latest interaction");
  selectInstance(undefined);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("dialog", "page"))
      ?.get("open")
  ).toBe(false);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("dialog", "page"))
      ?.get("title")
  ).toBe("latest interaction");
});

test.each([
  [component("Tabs"), component("TabsContent")],
  ["Select", "Option"],
])(
  "selected %s follows an authored expression and updated variable",
  async (ownerComponent, itemComponent) => {
    const instances: Instances = new Map([
      ["page", instance("page", "Body", "tabs")],
      ["tabs", instance("tabs", ownerComponent, "content")],
      ["content", instance("content", itemComponent)],
    ]);
    setupPage(instances);
    $dataSources.set(
      new Map([
        [
          "tabValue",
          {
            id: "tabValue",
            scopeInstanceId: "tabs",
            type: "variable",
            name: "",
            value: { type: "string", value: "first" },
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "contentValue",
          {
            id: "contentValue",
            instanceId: "content",
            name: "value",
            type: "expression",
            value: "$ws$dataSource$tabValue",
          },
        ],
      ])
    );
    selectInstance(["content", "tabs", "page"]);
    await expect
      .poll(() =>
        $selectionOverrides.get().get(key("tabs", "page"))?.get("value")
      )
      .toBe("first");
    $dataSourceVariables.set(new Map([["tabValue", "second"]]));
    await expect
      .poll(() =>
        $selectionOverrides.get().get(key("tabs", "page"))?.get("value")
      )
      .toBe("second");
    expect($props.get().get("contentValue")?.type).toBe("expression");
    $selectedPageId.set(undefined);
    expect($selectionOverrides.get().size).toBe(0);
  }
);

test("resolved hidden feedback changes with selection without editing saved props", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "form")],
    ["form", instance("form", "Form", "success", "error")],
    ["success", instance("success", "Box")],
    ["error", instance("error", "Box")],
  ]);
  setupPage(instances);
  const baseProps = values([
    [["success", "form", "page"], { [showAttribute]: false }],
    [["error", "form", "page"], { [showAttribute]: false }],
  ]);
  $propValuesByInstanceSelector.set(baseProps);
  const authoredProps = $props.get();
  selectInstance(["success", "form", "page"]);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("success", "form", "page"))
      ?.get(showAttribute)
  ).toBe(true);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("error", "form", "page"))
      ?.get(showAttribute)
  ).toBe(false);
  selectInstance(["error", "form", "page"]);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("success", "form", "page"))
      ?.get(showAttribute)
  ).toBe(false);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("error", "form", "page"))
      ?.get(showAttribute)
  ).toBe(true);
  $propValuesByInstanceSelector.set(
    values([
      [["success", "form", "page"], { [showAttribute]: false }],
      [["error", "form", "page"], { [showAttribute]: true }],
    ])
  );
  expect(
    $selectionOverrides
      .get()
      .get(key("error", "form", "page"))
      ?.has(showAttribute)
  ).not.toBe(true);
  expect($props.get()).toBe(authoredProps);
  expect($memoryProps.get().size).toBe(0);
});

test("native options reveal the closest select using effective values and HTML text fallback", () => {
  for (const useElements of [false, true]) {
    const select = instance(
      "select",
      useElements ? "ws:element" : "Select",
      "option"
    );
    const option = instance("option", useElements ? "ws:element" : "Option");
    if (useElements) {
      select.tag = "select";
      option.tag = "option";
    }
    option.children = [{ type: "text", value: "  Option\n label  " }];
    const instances: Instances = new Map([
      ["page", instance("page", "Body", "outer")],
      ["outer", instance("outer", "Select", "select")],
      ["select", select],
      ["option", option],
    ]);
    const selector = ["option", "select", "outer", "page"];
    for (const value of ["bound value", "", 0]) {
      const result = resolve(
        instances,
        selector,
        values([[selector, { value }]])
      );
      expect(result.get(key("select", "outer", "page"))?.get("value")).toBe(
        value
      );
      expect(result.has(key("outer", "page"))).toBe(false);
    }
    expect(
      resolve(instances, selector)
        .get(key("select", "outer", "page"))
        ?.get("value")
    ).toBe("Option label");
    option.children = [{ type: "text", value: "\u00a0Second\u00a0" }];
    expect(
      resolve(instances, selector)
        .get(key("select", "outer", "page"))
        ?.get("value")
    ).toBe("\u00a0Second\u00a0");
    expect(resolve(instances, ["select", "outer", "page"]).size).toBe(0);
  }
});

test("HeadSlot reveals its selected path while animation only reveals an exact selection", () => {
  const animation = "@webstudio-is/sdk-components-animation:AnimateChildren";
  const animationProp = "data-ws-animation-can-play-on-canvas";
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "head", "animation")],
    ["head", instance("head", "HeadSlot", "meta")],
    ["meta", instance("meta", "HeadMeta")],
    ["animation", instance("animation", animation, "child")],
    ["child", instance("child", "Box")],
  ]);
  setupPage(instances);
  const base = values([
    [["head", "page"], { "data-ws-expand": false }],
    [["animation", "page"], { [animationProp]: false }],
  ]);
  $propValuesByInstanceSelector.set(base);
  const authored = $props.get();
  for (const selector of [
    ["head", "page"],
    ["meta", "head", "page"],
  ]) {
    selectInstance(selector);
    expect(
      $propValuesByInstanceSelectorWithMemoryProps
        .get()
        .get(key("head", "page"))
        ?.get("data-ws-expand")
    ).toBe(true);
  }
  selectInstance(["animation", "page"]);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("head", "page"))
      ?.get("data-ws-expand")
  ).toBe(false);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("animation", "page"))
      ?.get(animationProp)
  ).toBe(true);
  $builderMode.set("preview");
  expect($propValuesByInstanceSelectorWithMemoryProps.get()).toBe(base);
  $builderMode.set("design");
  selectInstance(["child", "animation", "page"]);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(key("animation", "page"))
      ?.get(animationProp)
  ).toBe(false);
  selectInstance(undefined);
  expect($selectionOverrides.get().size).toBe(0);
  expect($props.get()).toBe(authored);
  expect($propValuesByInstanceSelector.get()).toBe(base);
  expect($memoryProps.get().size).toBe(0);
});

test("native selection follows a bound value in one repeated occurrence and restores the base", () => {
  const instances: Instances = new Map([
    ["page", instance("page", "Body", "list")],
    ["list", instance("list", collectionComponent, "select")],
    ["select", instance("select", "Select", "option")],
    ["option", instance("option", "Option")],
  ]);
  setupPage(instances);
  const selector = ["option", "select", "list[1]", "list", "page"];
  const selectedOwner = key("select", "list[1]", "list", "page");
  const otherOwner = key("select", "list[0]", "list", "page");
  const base = values([
    [selector, { value: "bound" }],
    [["select", "list[1]", "list", "page"], { value: "authored" }],
    [["select", "list[0]", "list", "page"], { value: "other" }],
  ]);
  $propValuesByInstanceSelector.set(base);
  selectInstance(selector);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(selectedOwner)
      ?.get("value")
  ).toBe("bound");
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(otherOwner)
      ?.get("value")
  ).toBe("other");
  const updated = new Map(base);
  updated.set(key(...selector), new Map([["value", "updated binding"]]));
  $propValuesByInstanceSelector.set(updated);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(selectedOwner)
      ?.get("value")
  ).toBe("updated binding");
  $builderMode.set("preview");
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(selectedOwner)
      ?.get("value")
  ).toBe("authored");
  $builderMode.set("design");
  const stale = new Map(instances);
  stale.set("select", instance("select", "Select"));
  $instances.set(stale);
  expect($selectionOverrides.get().size).toBe(0);
  expect(
    $propValuesByInstanceSelectorWithMemoryProps
      .get()
      .get(selectedOwner)
      ?.get("value")
  ).toBe("authored");
  expect($memoryProps.get().size).toBe(0);
});
