import { describe, test, expect, vi } from "vitest";
import { enableMapSet } from "immer";
import { toast } from "@webstudio-is/design-system";
import type {
  Instance,
  Instances,
  Prop,
  Props,
  DataSource,
  DataSources,
  Resource,
  Resources,
} from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  collectionComponent,
  coreMetas,
  elementComponent,
  blockTemplateComponent,
  portalComponent,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { registerContainers } from "../sync/sync-stores";
import { $registeredComponentMetas } from "../nano-states";
import { $instances } from "~/shared/sync/data-stores";
import {
  $dataSources,
  $pages,
  $project,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { instanceText } from "./plugin-instance";
import { createDefaultPages } from "@webstudio-is/project-build";
import { selectInstance, selectInstances } from "~/shared/nano-states";
import { $allSelectedInstanceSelectors } from "~/shared/nano-states";
import { $selectedPageId } from "../nano-states/pages";
import * as instanceMutationUtils from "../instance-utils/mutation";
import {
  expectSlotTreeIntegrity,
  expectSlotsShareFragment,
} from "../slot-test-utils";
import { pasteHandled } from "./copy-paste";

const expectString = expect.any(String) as unknown as string;

enableMapSet();
registerContainers();

$registeredComponentMetas.set(
  new Map(Object.entries({ ...baseComponentMetas, ...coreMetas }))
);
$project.set({ id: "my-project" } as Project);
$pages.set(
  createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body0",
  })
);
$selectedPageId.set("home-page");

const setPageRoot = (rootInstanceId: Instance["id"]) => {
  $pages.set(
    createDefaultPages({
      homePageId: "home-page",
      rootInstanceId,
    })
  );
  $selectedPageId.set("home-page");
};

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const getMapDifference = <Type extends Map<unknown, unknown>>(
  left: Type,
  right: Type
): Type => {
  const leftSet = new Set(left.keys());
  const rightSet = new Set(right.keys());
  const difference = new Map() as Type;
  for (const [key, value] of left) {
    if (rightSet.has(key) === false) {
      difference.set(key, value);
    }
  }
  for (const [key, value] of right) {
    if (leftSet.has(key) === false) {
      difference.set(key, value);
    }
  }
  return difference;
};

describe("copy and cut guards", () => {
  test("does not copy without a selected instance", () => {
    selectInstance(undefined);

    expect(instanceText.onCopy?.()).toBeUndefined();
  });

  test("does not cut without a selected instance", () => {
    selectInstance(undefined);

    expect(instanceText.onCut?.()).toBeUndefined();
  });

  test("does not copy or cut the selected root instance", () => {
    const instances: Instances = toMap([
      createInstance("body0", "Body", [{ type: "id", value: "box1" }]),
      createInstance("box1", "Box", []),
    ] satisfies Instance[]);
    $instances.set(instances);
    selectInstance(["body0"]);

    expect(instanceText.onCopy?.()).toBeUndefined();
    expect(instanceText.onCut?.()).toBeUndefined();
    expect($instances.get()).toEqual(instances);
  });

  test("copies multiple selected roots into one combined fragment", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
        ]),
        createInstance("box1", "Box", []),
        createInstance("box2", "Box", []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["box1", "body0"],
      ["box2", "body0"],
    ]);

    const clipboardData = instanceText.onCopy?.();

    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instances/v0.1": {
        rootInstanceIds: ["box1", "box2"],
        fragment: {
          children: [
            { type: "id", value: "box1" },
            { type: "id", value: "box2" },
          ],
          instances: [
            { id: "box1", type: "instance", component: "Box", children: [] },
            { id: "box2", type: "instance", component: "Box", children: [] },
          ],
        },
      },
    });
  });

  test("pastes multiple copied roots in order and selects pasted roots", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
        ]),
        createInstance("box1", "Box", [{ type: "id", value: "child" }]),
        createInstance("child", "Box", []),
        createInstance("box2", "Box", []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["box1", "body0"],
      ["box2", "body0"],
    ]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["body0"]);

    const result = await instanceText.onPaste?.(clipboardData);
    expect(result).toEqual(pasteHandled);

    const bodyChildren = $instances.get().get("body0")?.children;
    const pastedRootIds = bodyChildren?.slice(2).map((child) => child.value);
    expect(bodyChildren).toEqual([
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: expect.any(String) },
    ]);
    expect(pastedRootIds?.[0]).not.toBe("box1");
    expect(pastedRootIds?.[1]).not.toBe("box2");
    expect($allSelectedInstanceSelectors.get()).toEqual([
      [pastedRootIds?.[0], "body0"],
      [pastedRootIds?.[1], "body0"],
    ]);
  });

  test("sanitizes multi-root clipboard root ids before paste", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
        ]),
        createInstance("box1", "Box", []),
        createInstance("box2", "Box", []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["box1", "body0"],
      ["box2", "body0"],
    ]);
    const clipboardData = JSON.parse(instanceText.onCopy?.() ?? "");
    clipboardData["@webstudio/instances/v0.1"].rootInstanceIds = [
      "box1",
      "child",
      "missing",
      "box1",
    ];
    selectInstance(["body0"]);

    expect(await instanceText.onPaste?.(JSON.stringify(clipboardData))).toEqual(
      pasteHandled
    );

    const bodyChildren = $instances.get().get("body0")?.children;
    expect(bodyChildren).toEqual([
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
      { type: "id", value: expect.any(String) },
    ]);

    clipboardData["@webstudio/instances/v0.1"].rootInstanceIds = ["missing"];
    expect(await instanceText.onPaste?.(JSON.stringify(clipboardData))).toEqual(
      pasteHandled
    );
    expect($instances.get().get("body0")?.children).toEqual(bodyChildren);
  });

  test("writes only copyable roots when multi-copy skips selected roots", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "template" },
        ]),
        createInstance("box1", "Box", []),
        createInstance("template", blockTemplateComponent, []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["template", "body0"],
      ["box1", "body0"],
    ]);

    const clipboardData = instanceText.onCopy?.();

    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instances/v0.1": {
        rootInstanceIds: ["box1"],
      },
    });
  });

  test("does not copy when no multi-selected root is copyable", () => {
    const instances: Instances = toMap([
      createInstance("body0", "Body", [
        { type: "id", value: "template1" },
        { type: "id", value: "template2" },
      ]),
      createInstance("template1", blockTemplateComponent, []),
      createInstance("template2", blockTemplateComponent, []),
    ] satisfies Instance[]);
    $instances.set(instances);
    selectInstances([
      ["template1", "body0"],
      ["template2", "body0"],
    ]);

    expect(instanceText.onCopy?.()).toBeUndefined();
    expect($instances.get()).toEqual(instances);
  });

  test("cuts multiple selected roots into one combined fragment and removes them", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
        ]),
        createInstance("box1", "Box", []),
        createInstance("box2", "Box", []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["box1", "body0"],
      ["box2", "body0"],
    ]);

    const clipboardData = instanceText.onCut?.();

    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instances/v0.1": {
        rootInstanceIds: ["box1", "box2"],
      },
    });
    expect($instances.get().get("body0")?.children).toEqual([]);
    expect($instances.get().has("box1")).toBe(false);
    expect($instances.get().has("box2")).toBe(false);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("cuts only copyable roots when multi-cut skips selected roots", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "template" },
        ]),
        createInstance("box1", "Box", []),
        createInstance("template", blockTemplateComponent, []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["template", "body0"],
      ["box1", "body0"],
    ]);

    const clipboardData = instanceText.onCut?.();

    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instances/v0.1": {
        rootInstanceIds: ["box1"],
      },
    });
    expect($instances.get().get("body0")?.children).toEqual([
      { type: "id", value: "template" },
    ]);
    expect($instances.get().has("box1")).toBe(false);
    expect($instances.get().has("template")).toBe(true);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("does not cut when no multi-selected root is copyable", () => {
    const instances: Instances = toMap([
      createInstance("body0", "Body", [
        { type: "id", value: "template1" },
        { type: "id", value: "template2" },
      ]),
      createInstance("template1", blockTemplateComponent, []),
      createInstance("template2", blockTemplateComponent, []),
    ] satisfies Instance[]);
    $instances.set(instances);
    selectInstances([
      ["template1", "body0"],
      ["template2", "body0"],
    ]);

    expect(instanceText.onCut?.()).toBeUndefined();
    expect($instances.get()).toEqual(instances);
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["template1", "body0"],
      ["template2", "body0"],
    ]);
  });
});

describe("paste target", () => {
  test("pastes radix navigation menu fragment with viewport wrapper", async () => {
    const previousMetas = $registeredComponentMetas.get();
    $registeredComponentMetas.set(componentMetas);
    $instances.set(toMap([createInstance("body0", "Body", [])]));
    selectInstance(["body0"]);

    const clipboardData = JSON.stringify({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["nav", "source-parent"],
        children: [{ type: "id", value: "nav" }],
        instances: [
          createInstance(
            "nav",
            "@webstudio-is/sdk-components-react-radix:NavigationMenu",
            [
              { type: "id", value: "list" },
              { type: "id", value: "viewport-container" },
            ]
          ),
          createInstance(
            "list",
            "@webstudio-is/sdk-components-react-radix:NavigationMenuList",
            [{ type: "id", value: "item" }]
          ),
          createInstance(
            "item",
            "@webstudio-is/sdk-components-react-radix:NavigationMenuItem",
            [
              { type: "id", value: "trigger" },
              { type: "id", value: "content" },
            ]
          ),
          createInstance(
            "trigger",
            "@webstudio-is/sdk-components-react-radix:NavigationMenuTrigger",
            [{ type: "id", value: "button" }]
          ),
          createInstance("button", "Button", [{ type: "id", value: "text" }]),
          createInstance("text", "Text", [{ type: "text", value: "About" }]),
          createInstance(
            "content",
            "@webstudio-is/sdk-components-react-radix:NavigationMenuContent",
            [{ type: "id", value: "content-box" }]
          ),
          createInstance("content-box", "Box", [
            { type: "id", value: "content-link" },
          ]),
          createInstance("content-link", "Link", [
            { type: "text", value: "Documentation" },
          ]),
          {
            ...createInstance("viewport-container", "Box", [
              { type: "id", value: "viewport" },
            ]),
            label: "Viewport Container",
          },
          createInstance(
            "viewport",
            "@webstudio-is/sdk-components-react-radix:NavigationMenuViewport",
            []
          ),
        ],
        assets: [],
        dataSources: [],
        resources: [],
        props: [],
        breakpoints: [],
        styleSourceSelections: [],
        styleSources: [],
        styles: [],
      },
    });

    const warn = vi.spyOn(toast, "warn").mockImplementation(() => "");
    const result = await instanceText.onPaste?.(clipboardData);
    expect(result).toEqual(pasteHandled);
    expect(warn).not.toHaveBeenCalled();

    const [pastedNavId] =
      $instances
        .get()
        .get("body0")
        ?.children.map((child) => child.value) ?? [];
    expect($instances.get().get(pastedNavId ?? "")?.component).toBe(
      "@webstudio-is/sdk-components-react-radix:NavigationMenu"
    );
    warn.mockRestore();
    $registeredComponentMetas.set(previousMetas);
  });

  // body0
  //   box1
  //   box2
  const instances: Instances = toMap([
    createInstance("body0", "Body", [
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
    ]),
    createInstance("box1", "Box", []),
    createInstance("box2", "Box", []),
  ] satisfies Instance[]);

  test("is inside selected instance", async () => {
    $instances.set(instances);
    selectInstance(["box1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["box2", "body0"]);
    await instanceText.onPaste?.(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1] = instancesDifference.keys();
    expect($instances.get().get("box2")).toEqual(
      createInstance("box2", "Box", [{ type: "id", value: newBox1 }])
    );
    expect(instancesDifference).toEqual(
      toMap([createInstance(newBox1, "Box", [])])
    );
  });

  test("is after selected instance when same as copied", async () => {
    $instances.set(instances);
    selectInstance(["box1", "body0"]);
    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1] = instancesDifference.keys();
    expect($instances.get().get("body0")).toEqual(
      createInstance("body0", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: newBox1 },
        { type: "id", value: "box2" },
      ])
    );
    expect(instancesDifference).toEqual(
      toMap([createInstance(newBox1, "Box", [])])
    );
  });

  test("uses multi-selection paste target after the last selected sibling for old single-root clipboard data", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
          { type: "id", value: "tail" },
        ]),
        createInstance("source", "Box", []),
        createInstance("box1", "Box", []),
        createInstance("box2", "Box", []),
        createInstance("tail", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstances([
      ["box1", "body0"],
      ["box2", "body0"],
    ]);

    await instanceText.onPaste?.(clipboardData);

    const bodyChildren = $instances.get().get("body0")?.children;
    expect(bodyChildren).toEqual([
      { type: "id", value: "source" },
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "tail" },
    ]);
    const pastedId = bodyChildren?.[3]?.value;
    expect(pastedId).not.toBe("source");
    expect($allSelectedInstanceSelectors.get()).toEqual([[pastedId, "body0"]]);
  });

  test("uses multi-selection paste target after the last selected sibling for multi-root clipboard data", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source1" },
          { type: "id", value: "source2" },
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
          { type: "id", value: "tail" },
        ]),
        createInstance("source1", "Box", []),
        createInstance("source2", "Box", []),
        createInstance("box1", "Box", []),
        createInstance("box2", "Box", []),
        createInstance("tail", "Box", []),
      ] satisfies Instance[])
    );
    selectInstances([
      ["source1", "body0"],
      ["source2", "body0"],
    ]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstances([
      ["box1", "body0"],
      ["box2", "body0"],
    ]);

    await instanceText.onPaste?.(clipboardData);

    const bodyChildren = $instances.get().get("body0")?.children;
    expect(bodyChildren).toEqual([
      { type: "id", value: "source1" },
      { type: "id", value: "source2" },
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "tail" },
    ]);
  });

  test("uses lowest common ancestor paste target for mixed-parent multi-selection", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "section" },
          { type: "id", value: "footer" },
        ]),
        createInstance("source", "Box", []),
        createInstance("section", "Box", [
          { type: "id", value: "group" },
          { type: "id", value: "aside" },
          { type: "id", value: "tail" },
        ]),
        createInstance("group", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
        createInstance("aside", "Box", []),
        createInstance("tail", "Box", []),
        createInstance("footer", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstances([
      ["box", "group", "section", "body0"],
      ["aside", "section", "body0"],
    ]);

    await instanceText.onPaste?.(clipboardData);

    expect($instances.get().get("section")?.children).toEqual([
      { type: "id", value: "group" },
      { type: "id", value: "aside" },
      { type: "id", value: "tail" },
      { type: "id", value: expect.any(String) },
    ]);
    expect($instances.get().get("body0")?.children).toEqual([
      { type: "id", value: "source" },
      { type: "id", value: "section" },
      { type: "id", value: "footer" },
    ]);
  });

  test("pastes into shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("source", "Box", []),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["slot1", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes into legacy shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("source", "Box", []),
        createInstance("slot1", "Slot", [{ type: "id", value: "box" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["slot1", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes after selected shared slot child in shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);

    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes after selected legacy shared slot child in shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "slot1", "body0"]);

    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "heading" },
    ]);
    expectSlotTreeIntegrity($instances.get());
  });

  test("pastes after selected nested shared slot child in shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "div", "fragment", "slot1", "body0"]);

    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes into nested shared slot container", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("source", "Box", []),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["div", "fragment", "slot1", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("copies shared slot child and pastes independent copy outside", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
          { type: "id", value: "target" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
        createInstance("target", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["target", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    const pastedBoxId = $instances.get().get("target")?.children[0]?.value;
    expect(pastedBoxId).toEqual(expect.any(String));
    expect(pastedBoxId).not.toBe("box");
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
    expect($instances.get().get(pastedBoxId ?? "")?.children).toEqual([]);
  });

  test("copies legacy shared slot child and pastes independent copy outside", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
          { type: "id", value: "target" },
        ]),
        createInstance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
        createInstance("target", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "slot1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["target", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    const pastedBoxId = $instances.get().get("target")?.children[0]?.value;
    expect(pastedBoxId).toEqual(expect.any(String));
    expect(pastedBoxId).not.toBe("box");
    expect($instances.get().get(pastedBoxId ?? "")?.component).toBe("Box");

    selectInstance(["box", "slot1", "body0"]);
    instanceMutationUtils.convertInstance(elementComponent, "section");

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("box")?.component).toBe(elementComponent);
    expect($instances.get().get("box")?.tag).toBe("section");
    expect($instances.get().get(pastedBoxId ?? "")?.component).toBe("Box");
  });

  test("copies nested shared slot child with scoped data and pastes independent copy outside", async () => {
    const dataSources: DataSources = toMap([
      {
        id: "boxVariable",
        scopeInstanceId: "box",
        type: "variable",
        name: "Box Variable",
        value: { type: "string", value: "value" },
      },
    ] satisfies DataSource[]);
    const props: Props = toMap([
      {
        id: "boxExpressionProp",
        instanceId: "box",
        name: "children",
        type: "expression",
        value: "$ws$dataSource$boxVariable",
      },
      {
        id: "boxResourceProp",
        instanceId: "box",
        name: "resource",
        type: "resource",
        value: "boxResource",
      },
    ] satisfies Prop[]);
    const resources: Resources = toMap([
      {
        id: "boxResource",
        name: "Box Resource",
        method: "get",
        url: "$ws$dataSource$boxVariable",
        headers: [
          {
            name: "authorization",
            value: "$ws$dataSource$boxVariable",
          },
        ],
        searchParams: [
          {
            name: "query",
            value: "$ws$dataSource$boxVariable",
          },
        ],
      },
    ] satisfies Resource[]);
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
          { type: "id", value: "target" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
        createInstance("target", "Box", []),
      ] satisfies Instance[])
    );
    $dataSources.set(dataSources);
    $props.set(props);
    $resources.set(resources);
    selectInstance(["box", "div", "fragment", "slot1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["target", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    const pastedBoxId = $instances.get().get("target")?.children[0]?.value;
    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    const [newDataSourceId] = dataSourcesDifference.keys();
    const propsDifference = getMapDifference(props, $props.get());
    const resourcesDifference = getMapDifference(resources, $resources.get());
    const [newResourceId] = resourcesDifference.keys();
    expect(pastedBoxId).toEqual(expect.any(String));
    expect(pastedBoxId).not.toBe("box");
    expect(dataSourcesDifference).toEqual(
      toMap([
        {
          ...dataSources.get("boxVariable"),
          id: newDataSourceId,
          scopeInstanceId: pastedBoxId,
        },
      ])
    );
    expect(Array.from(propsDifference.values())).toEqual(
      expect.arrayContaining([
        {
          id: expectString,
          instanceId: pastedBoxId,
          name: "children",
          type: "expression",
          value: encodeDataSourceVariable(newDataSourceId),
        },
        {
          id: expectString,
          instanceId: pastedBoxId,
          name: "resource",
          type: "resource",
          value: newResourceId,
        },
      ])
    );
    expect(resourcesDifference).toEqual(
      toMap([
        {
          id: newResourceId,
          name: "Box Resource",
          method: "get",
          url: encodeDataSourceVariable(newDataSourceId),
          headers: [
            {
              name: "authorization",
              value: encodeDataSourceVariable(newDataSourceId),
            },
          ],
          searchParams: [
            {
              name: "query",
              value: encodeDataSourceVariable(newDataSourceId),
            },
          ],
        },
      ])
    );
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("cuts shared slot child from all slot occurrences", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);

    const clipboardData = instanceText.onCut?.();
    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["box", "fragment", "slot1", "body0"],
        children: [{ type: "id", value: "box" }],
      },
    });

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([]);
    expect($instances.get().has("box")).toBe(false);
  });

  test("cuts legacy shared slot child from all slot occurrences", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "slot1", "body0"]);

    const clipboardData = instanceText.onCut?.();
    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["box", "slot1", "body0"],
        children: [{ type: "id", value: "box" }],
      },
    });

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().has("box")).toBe(false);
  });

  test("cuts nested shared slot child from all slot occurrences", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "div", "fragment", "slot1", "body0"]);

    const clipboardData = instanceText.onCut?.();
    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["box", "div", "fragment", "slot1", "body0"],
        children: [{ type: "id", value: "box" }],
      },
    });

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([]);
    expect($instances.get().has("box")).toBe(false);
  });

  test("cuts shared slot child and preserves shared siblings", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);

    const clipboardData = instanceText.onCut?.();
    expect(JSON.parse(clipboardData ?? "")).toMatchObject({
      "@webstudio/instance/v0.1": {
        instanceSelector: ["box", "fragment", "slot1", "body0"],
        children: [{ type: "id", value: "box" }],
      },
    });

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().has("box")).toBe(false);
  });
});

describe("data sources", () => {
  // body0
  //   box1
  //     box2
  const instances: Instances = toMap([
    createInstance("body0", "Body", [{ type: "id", value: "box1" }]),
    createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
    createInstance("box2", "Box", []),
  ] satisfies Instance[]);
  const dataSources: DataSources = toMap([
    {
      id: "box1$state",
      scopeInstanceId: "box1",
      type: "variable",
      name: "state",
      value: { type: "string", value: "initial" },
    },
  ] satisfies DataSource[]);
  const props: Props = toMap([
    {
      id: "box1$stateProp",
      instanceId: "box1",
      name: "state",
      type: "expression",
      value: "$ws$dataSource$box1$state",
    },
    {
      id: "box2$stateProp",
      instanceId: "box2",
      name: "state",
      type: "expression",
      value: "$ws$dataSource$box1$state",
    },
    {
      id: "box2$showProp",
      instanceId: "box2",
      name: "show",
      type: "expression",
      value: `$ws$dataSource$box1$state === 'initial'`,
    },
    {
      id: "box2$onChangeProp",
      instanceId: "box2",
      type: "action",
      name: "onChange",
      value: [
        {
          type: "execute",
          args: ["value"],
          code: `$ws$dataSource$box1$state = value`,
        },
      ],
    },
  ] satisfies Prop[]);

  test("are copy pasted when scoped to copied instances", async () => {
    $instances.set(instances);
    $dataSources.set(dataSources);
    $props.set(props);
    selectInstance(["box1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["body0"]);
    await instanceText.onPaste?.(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1, newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    const [newDataSource1] = dataSourcesDifference.keys();
    expect(dataSourcesDifference).toEqual(
      toMap([
        {
          ...dataSources.get("box1$state"),
          id: newDataSource1,
          scopeInstanceId: newBox1,
        },
      ])
    );

    const propsDifference = getMapDifference(props, $props.get());
    const [newProp1, newProp2, newProp3, newProp4] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: newProp1,
          instanceId: newBox1,
          name: "state",
          type: "expression",
          value: encodeDataSourceVariable(newDataSource1),
        },
        {
          id: newProp2,
          instanceId: newBox2,
          name: "state",
          type: "expression",
          value: encodeDataSourceVariable(newDataSource1),
        },
        {
          id: newProp3,
          instanceId: newBox2,
          name: "show",
          type: "expression",
          value: `${encodeDataSourceVariable(newDataSource1)} === 'initial'`,
        },
        {
          id: newProp4,
          instanceId: newBox2,
          name: "onChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `${encodeDataSourceVariable(newDataSource1)} = value`,
            },
          ],
        },
      ])
    );
  });

  test("preserve data sources outside of scope when pasted within their scope", async () => {
    $instances.set(instances);
    $props.set(props);
    $dataSources.set(dataSources);
    selectInstance(["box2", "box1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["box1", "body0"]);
    await instanceText.onPaste?.(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    expect(dataSourcesDifference).toEqual(new Map());

    const propsDifference = getMapDifference(props, $props.get());
    const [newProp1, newProp2, newProp3] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: newProp1,
          instanceId: newBox2,
          name: "state",
          type: "expression",
          value: `$ws$dataSource$box1$state`,
        },
        {
          id: newProp2,
          instanceId: newBox2,
          name: "show",
          type: "expression",
          value: `$ws$dataSource$box1$state === 'initial'`,
        },
        {
          id: newProp3,
          instanceId: newBox2,
          type: "action",
          name: "onChange",
          value: [
            {
              args: ["value"],
              code: "$ws$dataSource$box1$state = value",
              type: "execute",
            },
          ],
        },
      ])
    );
  });

  test("copy parameter prop with new data source", async () => {
    setPageRoot("body");
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "list" }]),
      createInstance("list", collectionComponent, []),
    ] satisfies Instance[]);
    const dataSources: DataSources = toMap([
      {
        id: "itemDataSource",
        scopeInstanceId: "list",
        type: "parameter",
        name: "item",
      },
    ] satisfies DataSource[]);
    const props: Props = toMap([
      {
        id: "dataProp",
        instanceId: "list",
        name: "data",
        type: "json",
        value: [],
      },
      {
        id: "itemProp",
        instanceId: "list",
        name: "item",
        type: "parameter",
        value: "itemDataSource",
      },
    ] satisfies Prop[]);
    $instances.set(instances);
    $props.set(props);
    $dataSources.set(dataSources);
    selectInstance(["list", "body"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["body"]);
    await instanceText.onPaste?.(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [collectionId] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    const [itemDataSourceId] = dataSourcesDifference.keys();
    expect(dataSourcesDifference).toEqual(
      new Map([
        [
          itemDataSourceId,
          {
            id: itemDataSourceId,
            scopeInstanceId: collectionId,
            type: "parameter",
            name: "item",
          },
        ],
      ])
    );

    const propsDifference = getMapDifference(props, $props.get());
    const [dataPropId, itemPropId] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: dataPropId,
          instanceId: collectionId,
          name: "data",
          type: "json",
          value: [],
        },
        {
          id: itemPropId,
          instanceId: collectionId,
          name: "item",
          type: "parameter",
          value: itemDataSourceId,
        },
      ])
    );
  });
});

test("when paste into copied instance insert after it", async () => {
  setPageRoot("body");
  $instances.set(
    toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", []),
    ])
  );
  selectInstance(["box", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  await instanceText.onPaste?.(clipboardData);

  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "box" },
        { type: "id", value: expectString },
      ]),
      createInstance("box", "Box", []),
      createInstance(expectString, "Box", []),
    ])
  );
});

test("prevent pasting portal into own descendants", async () => {
  const instances = toMap([
    createInstance("body", "Body", [{ type: "id", value: "portal" }]),
    createInstance("portal", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
    createInstance("box", "Box", []),
  ]);
  $instances.set(instances);
  selectInstance(["portal", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["fragment", "portal", "body"]);
  await instanceText.onPaste?.(clipboardData);
  expect($instances.get()).toEqual(instances);
});

test("prevent pasting portal into copy of it", async () => {
  const instances = toMap([
    createInstance("body", "Body", [
      { type: "id", value: "portal1" },
      { type: "id", value: "portal2" },
    ]),
    createInstance("portal1", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("portal2", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("fragment", "Fragment", []),
  ]);
  $instances.set(instances);
  selectInstance(["portal1", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["portal2", "body"]);
  await instanceText.onPaste?.(clipboardData);
  expect($instances.get()).toEqual(instances);
});

test("insert portal into its sibling", async () => {
  setPageRoot("body");
  $instances.set(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "sibling" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: "fragment" },
      ]),
      createInstance("fragment", "Fragment", []),
      createInstance("sibling", "Box", []),
    ])
  );
  selectInstance(["portal", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["sibling", "body"]);
  await instanceText.onPaste?.(clipboardData);

  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "sibling" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: "fragment" },
      ]),
      createInstance("fragment", "Fragment", []),
      createInstance("sibling", "Box", [{ type: "id", value: expectString }]),
      createInstance(expectString, portalComponent, [
        { type: "id", value: "fragment" },
      ]),
    ])
  );
});

test("inserts multi-root clipboard into descendant of copied non-portal root", async () => {
  setPageRoot("body");
  $instances.set(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "box" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: "fragment" },
      ]),
      createInstance("fragment", "Fragment", []),
      createInstance("box", "Box", [{ type: "id", value: "target" }]),
      createInstance("target", "Box", []),
    ])
  );
  selectInstances([
    ["portal", "body"],
    ["box", "body"],
  ]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["target", "box", "body"]);

  await instanceText.onPaste?.(clipboardData);

  const targetChildren = $instances.get().get("target")?.children;
  const [pastedPortalId, pastedBoxId] =
    targetChildren?.map((child) => (child.type === "id" ? child.value : "")) ??
    [];
  expect(targetChildren).toEqual([
    { type: "id", value: expectString },
    { type: "id", value: expectString },
  ]);
  expect($instances.get().get(pastedPortalId ?? "")?.component).toBe(
    portalComponent
  );
  expect($instances.get().get(pastedBoxId ?? "")?.component).toBe("Box");
});

test("insert into portal fragment when portal is a target", async () => {
  setPageRoot("body");
  $instances.set(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "box" },
      ]),
      createInstance("portal", portalComponent, []),
      createInstance("box", "Box", []),
    ])
  );
  selectInstance(["box", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["portal", "body"]);

  // fragment not exists
  const prevInstances = $instances.get();
  await instanceText.onPaste?.(clipboardData);
  const newInstances = getMapDifference(prevInstances, $instances.get());
  const boxId = Array.from(newInstances.values()).find(
    (instance) => instance.component === "Box"
  )?.id;
  const fragmentId = Array.from(newInstances.values()).find(
    (instance) => instance.component === "Fragment"
  )?.id;
  if (boxId === undefined || fragmentId === undefined) {
    throw Error("Expected pasted Box and Fragment instances");
  }
  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "box" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: fragmentId },
      ]),
      createInstance(fragmentId, "Fragment", [{ type: "id", value: boxId }]),
      createInstance("box", "Box", []),
      createInstance(boxId, "Box", []),
    ])
  );

  // fragment already exists
  selectInstance(["portal", "body"]);
  await instanceText.onPaste?.(clipboardData);
  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "box" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: fragmentId },
      ]),
      createInstance(fragmentId, "Fragment", [
        { type: "id", value: boxId },
        { type: "id", value: expectString },
      ]),
      createInstance("box", "Box", []),
      createInstance(boxId, "Box", []),
      createInstance(expectString, "Box", []),
    ])
  );
});
