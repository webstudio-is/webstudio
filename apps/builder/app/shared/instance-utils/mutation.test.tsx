import {
  reparentInstance,
  wrapInstance,
  toggleInstanceShow,
  unwrapInstance,
  canUnwrapInstance,
  convertInstance,
} from "./mutation";
import { deleteSelectedInstance } from "./mutation";
import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach } from "vitest";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime";
import {
  canConvertInstance,
  reparentInstanceMutable,
} from "@webstudio-is/project-build/runtime";
import { $, ws, expression, renderData } from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixMetas from "@webstudio-is/sdk-components-react-radix/metas";
import type {
  DataSource,
  Instance,
  Prop,
  Resource,
  StyleDecl,
  WebstudioData,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  coreMetas,
  getStyleDeclKey,
  elementComponent,
} from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import type { InstancePath } from "@webstudio-is/project-build/runtime";
import { $registeredComponentMetas } from "../nano-states";
import {
  $instances,
  $pages,
  $project,
  $props,
} from "~/shared/sync/data-stores";
import { registerContainers } from "../sync/sync-stores";
import { $selectedInstanceSelector } from "../nano-states";
import { selectInstance } from "../nano-states";
import { $selectedPageId } from "../nano-states/pages";
import {
  expectSlotTreeIntegrity,
  expectSlotsShareFragment,
  getSlotFragmentId,
} from "../slot-test-utils";
import type {
  DroppableTarget,
  InstanceSelector,
} from "@webstudio-is/project-build/runtime";

enableMapSet();
registerContainers();

$pages.set(createDefaultPages({ rootInstanceId: "" }));

const defaultMetasMap = new Map(
  Object.entries({ ...defaultMetas, ...coreMetas })
);
$registeredComponentMetas.set(defaultMetasMap);

const reparentTestInstanceMutable = (
  data: Omit<WebstudioData, "pages">,
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) =>
  reparentInstanceMutable({
    data,
    sourceInstanceSelector,
    dropTarget,
    createId: builderRuntimeContext.createId,
  });

const createFakeComponentMetas = (
  itemMeta: Partial<WsComponentMeta>,
  anotherItemMeta?: Partial<WsComponentMeta>
): Map<string, WsComponentMeta> => {
  const base = {
    label: "",
    Icon: () => null,
  };
  const configs = {
    Item: { ...base, ...itemMeta },
    AnotherItem: { ...base, ...anotherItemMeta },
    Bold: base,
    Text: base,
    Form: base,
    Box: base,
    Div: base,
    Body: base,
  } as const;
  return new Map(Object.entries(configs)) as Map<string, WsComponentMeta>;
};

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value: typeof value === "string" ? { type: "unparsed", value } : value,
});

describe("reparent instance", () => {
  beforeEach(() => {
    $project.set({ id: "projectId" } as Project);
  });

  test("between instances", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box">
          <$.Text ws:id="text"></$.Text>
        </$.Box>
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["text", "box", "body"], {
      parentSelector: ["body"],
      position: 1,
    });
    const newTextId = data.instances.get("body")?.children[1].value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
          <$.Text ws:id={newTextId}></$.Text>
          <$.Button ws:id="button"></$.Button>
        </$.Body>
      ).instances
    );
  });

  test("to the end", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box">
          <$.Text ws:id="text"></$.Text>
        </$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["text", "box", "body"], {
      parentSelector: ["body"],
      position: "end",
    });
    const newTextId = data.instances.get("body")?.children[1].value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
          <$.Text ws:id={newTextId}></$.Text>
        </$.Body>
      ).instances
    );
  });

  test("reparentInstance wrapper updates stores and selection", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="source"></$.Box>
        <$.Box ws:id="target"></$.Box>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $instances.set(data.instances);
    $props.set(data.props);

    reparentInstance(["source", "body"], {
      parentSelector: ["target", "body"],
      position: "end",
    });

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "target" },
    ]);
    expect($instances.get().get("target")?.children).toEqual([
      { type: "id", value: "source" },
    ]);
    expect($selectedInstanceSelector.get()).toEqual([
      "source",
      "target",
      "body",
    ]);
  });

  test("before itself", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Text ws:id="text"></$.Text>
        <$.Box ws:id="box"></$.Box>
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["body"],
      position: 1,
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text"></$.Text>
          <$.Box ws:id="box"></$.Box>
          <$.Button ws:id="button"></$.Button>
        </$.Body>
      ).instances
    );
  });

  test("after itself", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Text ws:id="text"></$.Text>
        <$.Box ws:id="box"></$.Box>
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["body"],
      position: 2,
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text"></$.Text>
          <$.Box ws:id="box"></$.Box>
          <$.Button ws:id="button"></$.Button>
        </$.Body>
      ).instances
    );
  });

  test("wrap with fragment when reparent into empty slot", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot"></$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot", "body"],
      position: "end",
    });
    const newFragmentId = data.instances.get("slot")?.children[0]
      .value as string;
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id={newFragmentId}>
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("reuse existing fragment when reparent into slot", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot">
          <$.Fragment ws:id="fragment"></$.Fragment>
        </$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("reparent into legacy slot with direct children wraps content in fragment", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot">
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot", "body"],
      position: "end",
    });

    const fragmentId = data.instances.get("slot")?.children[0]?.value;
    expect(fragmentId).toEqual(expect.any(String));
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id={fragmentId}>
              <$.Heading ws:id="heading"></$.Heading>
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("reparent into legacy shared slot content normalizes all occurrences", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
    ]);
  });

  test("reparent into empty legacy shared slot content normalizes all occurrences", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1"></$.Slot>
        <$.Slot ws:id="slot2"></$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("reparent into legacy shared slot content preserves text and expression children", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1"></$.Slot>
        <$.Slot ws:id="slot2"></$.Slot>
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    data.instances.set(
      "slot1",
      createInstance("slot1", "Slot", [
        { type: "text", value: "Text child" },
        { type: "expression", value: "expressionChild" },
        { type: "id", value: "heading" },
      ])
    );
    data.instances.set(
      "slot2",
      createInstance("slot2", "Slot", [
        { type: "text", value: "Text child" },
        { type: "expression", value: "expressionChild" },
        { type: "id", value: "heading" },
      ])
    );
    data.instances.set("heading", createInstance("heading", "Heading", []));
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    const textWrapperId = data.instances.get(fragmentId ?? "")?.children[0]
      ?.value;
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: textWrapperId },
      { type: "id", value: "box" },
    ]);
    expect(data.instances.get(textWrapperId ?? "")?.children).toEqual([
      { type: "text", value: "Text child" },
      { type: "expression", value: "expressionChild" },
      { type: "id", value: "heading" },
    ]);
  });

  test("reparent into legacy slot does not normalize unrelated overlapping slot", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          <$.Box ws:id="box"></$.Box>
        </$.Slot>
        <$.Text ws:id="text"></$.Text>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["text", "body"], {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    const fragmentId = getSlotFragmentId(data.instances, "slot1");
    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
      { type: "id", value: "text" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("sort legacy shared slot content through visible slot drop target", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box1"></$.Box>
          <$.Box ws:id="box2"></$.Box>
          <$.Box ws:id="box3"></$.Box>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box1"></$.Box>
          <$.Box ws:id="box2"></$.Box>
          <$.Box ws:id="box3"></$.Box>
        </$.Slot>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box1", "slot1", "body"], {
      parentSelector: ["slot2", "body"],
      position: 3,
    });

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box2" },
      { type: "id", value: "box3" },
      { type: "id", value: "box1" },
    ]);
  });

  test("reparent legacy shared slot child outside removes it from all slot occurrences", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "slot1", "body"], {
      parentSelector: ["body"],
      position: "end",
    });

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    const bodyChildId = data.instances.get("body")?.children.at(-1)?.value;
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect(bodyChildId).toBe("box");
  });

  test("reparent legacy shared slot child into another slot updates both shared slots", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="sourceSlot1">
          <$.Box ws:id="box"></$.Box>
          <$.Text ws:id="text"></$.Text>
        </$.Slot>
        <$.Slot ws:id="sourceSlot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
          <$.Text ws:id="text"></$.Text>
        </$.Slot>
        <$.Slot ws:id="targetSlot1">
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="targetSlot2">
          {/* same ids */}
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "sourceSlot1", "body"], {
      parentSelector: ["targetSlot1", "body"],
      position: "end",
    });

    const sourceSlot1FragmentId =
      data.instances.get("sourceSlot1")?.children[0]?.value;
    const sourceSlot2FragmentId =
      data.instances.get("sourceSlot2")?.children[0]?.value;
    const targetFragmentId =
      data.instances.get("targetSlot1")?.children[0]?.value;
    const movedBoxId = data.instances.get(targetFragmentId ?? "")?.children[1]
      ?.value;
    expect(sourceSlot1FragmentId).toBe(sourceSlot2FragmentId);
    expect(data.instances.get(sourceSlot1FragmentId ?? "")?.children).toEqual([
      { type: "id", value: "text" },
    ]);
    expect(data.instances.get("targetSlot1")?.children).toEqual([
      { type: "id", value: targetFragmentId },
    ]);
    expect(data.instances.get("targetSlot2")?.children).toEqual([
      { type: "id", value: targetFragmentId },
    ]);
    expect(data.instances.get(targetFragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
    ]);
    expect(movedBoxId).toBe("box");
  });

  test("reparent slot child from one instance of this slot into another", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["box", "fragment", "slot1", "body"], {
      parentSelector: ["slot2", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("sort shared slot content through visible slot drop target", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box1"></$.Box>
            <$.Box ws:id="box2"></$.Box>
            <$.Box ws:id="box3"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box1"></$.Box>
            <$.Box ws:id="box2"></$.Box>
            <$.Box ws:id="box3"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box1", "fragment", "slot1", "body"], {
      parentSelector: ["slot2", "body"],
      position: 3,
    });

    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "box2" },
      { type: "id", value: "box3" },
      { type: "id", value: "box1" },
    ]);
  });

  test("reparent shared slot child into sibling in shared slot content", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(
      data,
      ["heading", "fragment", "slot1", "body"],
      {
        parentSelector: ["div", "fragment", "slot1", "body"],
        position: "end",
      }
    );

    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect(data.instances.get("div")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("reparent nested shared slot child within shared slot content", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Heading ws:id="heading"></$.Heading>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Heading ws:id="heading"></$.Heading>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(
      data,
      ["heading", "div", "fragment", "slot1", "body"],
      {
        parentSelector: ["fragment", "slot1", "body"],
        position: "end",
      }
    );

    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
      { type: "id", value: "heading" },
    ]);
    expect(data.instances.get("div")?.children).toEqual([]);
  });

  test("reparent normal child into slot makes it shared slot content", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    expect(data.instances.get("body")?.children).toEqual([
      { type: "id", value: "slot1" },
      { type: "id", value: "slot2" },
    ]);
    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
    ]);
  });

  test("reparent normal child into nested shared slot container makes it shared", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "body"], {
      parentSelector: ["div", "fragment", "slot1", "body"],
      position: "end",
    });

    expect(data.instances.get("body")?.children).toEqual([
      { type: "id", value: "slot1" },
      { type: "id", value: "slot2" },
    ]);
    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect(data.instances.get("div")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("reparent child from one slot into another updates both shared slot contents", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="sourceSlot1">
          <$.Fragment ws:id="sourceFragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="sourceSlot2">
          {/* same ids */}
          <$.Fragment ws:id="sourceFragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="targetSlot1">
          <$.Fragment ws:id="targetFragment">
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="targetSlot2">
          {/* same ids */}
          <$.Fragment ws:id="targetFragment">
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(
      data,
      ["box", "sourceFragment", "sourceSlot1", "body"],
      {
        parentSelector: ["targetSlot1", "body"],
        position: "end",
      }
    );

    expect(data.instances.get("sourceSlot1")?.children).toEqual([
      { type: "id", value: "sourceFragment" },
    ]);
    expect(data.instances.get("sourceSlot2")?.children).toEqual([
      { type: "id", value: "sourceFragment" },
    ]);
    expect(data.instances.get("sourceFragment")?.children).toEqual([]);
    expect(data.instances.get("targetSlot1")?.children).toEqual([
      { type: "id", value: "targetFragment" },
    ]);
    expect(data.instances.get("targetSlot2")?.children).toEqual([
      { type: "id", value: "targetFragment" },
    ]);
    expect(data.instances.get("targetFragment")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
    ]);
  });

  test("reparent child from one slot into nested container in another slot", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="sourceSlot1">
          <$.Fragment ws:id="sourceFragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="sourceSlot2">
          {/* same ids */}
          <$.Fragment ws:id="sourceFragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="targetSlot1">
          <$.Fragment ws:id="targetFragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="targetSlot2">
          {/* same ids */}
          <$.Fragment ws:id="targetFragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(
      data,
      ["box", "sourceFragment", "sourceSlot1", "body"],
      {
        parentSelector: ["div", "targetFragment", "targetSlot1", "body"],
        position: "end",
      }
    );

    const movedBoxId = data.instances.get("div")?.children[0]?.value;
    expect(data.instances.get("sourceSlot1")?.children).toEqual([
      { type: "id", value: "sourceFragment" },
    ]);
    expect(data.instances.get("sourceSlot2")?.children).toEqual([
      { type: "id", value: "sourceFragment" },
    ]);
    expect(data.instances.get("sourceFragment")?.children).toEqual([]);
    expect(data.instances.get("targetSlot1")?.children).toEqual([
      { type: "id", value: "targetFragment" },
    ]);
    expect(data.instances.get("targetSlot2")?.children).toEqual([
      { type: "id", value: "targetFragment" },
    ]);
    expect(movedBoxId).toBe("box");
    expect(data.instances.get("div")?.children).toEqual([
      { type: "id", value: movedBoxId },
    ]);
  });

  test("reparent child from one slot into another preserves source siblings", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="sourceSlot1">
          <$.Fragment ws:id="sourceFragment">
            <$.Box ws:id="box"></$.Box>
            <$.Text ws:id="text"></$.Text>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="sourceSlot2">
          {/* same ids */}
          <$.Fragment ws:id="sourceFragment">
            <$.Box ws:id="box"></$.Box>
            <$.Text ws:id="text"></$.Text>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="targetSlot1">
          <$.Fragment ws:id="targetFragment">
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="targetSlot2">
          {/* same ids */}
          <$.Fragment ws:id="targetFragment">
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(
      data,
      ["box", "sourceFragment", "sourceSlot1", "body"],
      {
        parentSelector: ["targetSlot1", "body"],
        position: "end",
      }
    );

    const sourceSlot1FragmentId =
      data.instances.get("sourceSlot1")?.children[0]?.value;
    expect(sourceSlot1FragmentId).toBe("sourceFragment");
    expect(data.instances.get(sourceSlot1FragmentId ?? "")?.children).toEqual([
      { type: "id", value: "text" },
    ]);
    expect(data.instances.get("sourceSlot2")?.children).toEqual([
      { type: "id", value: "sourceFragment" },
    ]);
    expect(data.instances.get("sourceFragment")?.children).toEqual([
      { type: "id", value: "text" },
    ]);
    expect(data.instances.get("targetSlot1")?.children).toEqual([
      { type: "id", value: "targetFragment" },
    ]);
    expect(data.instances.get("targetSlot2")?.children).toEqual([
      { type: "id", value: "targetFragment" },
    ]);
    expect(data.instances.get("targetFragment")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
    ]);
  });

  test("reparent slot operation matrix preserves sharing and detach invariants", () => {
    const random = (() => {
      let seed = 1;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
    })();
    const operations: Array<
      () => {
        data: Omit<WebstudioData, "pages">;
        sourceSelector: InstanceSelector;
        dropTarget: DroppableTarget;
        assert: (data: Omit<WebstudioData, "pages">) => void;
      }
    > = [
      () => ({
        data: renderData(
          <$.Body ws:id="body">
            <$.Slot ws:id="slot1">
              <$.Fragment ws:id="fragment">
                <$.Box ws:id="box1"></$.Box>
                <$.Box ws:id="box2"></$.Box>
                <$.Box ws:id="box3"></$.Box>
              </$.Fragment>
            </$.Slot>
            <$.Slot ws:id="slot2">
              {/* same ids */}
              <$.Fragment ws:id="fragment">
                <$.Box ws:id="box1"></$.Box>
                <$.Box ws:id="box2"></$.Box>
                <$.Box ws:id="box3"></$.Box>
              </$.Fragment>
            </$.Slot>
          </$.Body>
        ),
        sourceSelector: ["box1", "fragment", "slot1", "body"],
        dropTarget: {
          parentSelector: ["slot2", "body"],
          position: 3,
        },
        assert: (data) => {
          const fragmentId = expectSlotsShareFragment(data.instances, [
            "slot1",
            "slot2",
          ]);
          expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
            { type: "id", value: "box2" },
            { type: "id", value: "box3" },
            { type: "id", value: "box1" },
          ]);
        },
      }),
      () => ({
        data: renderData(
          <$.Body ws:id="body">
            <$.Slot ws:id="slot1">
              <$.Box ws:id="box1"></$.Box>
              <$.Box ws:id="box2"></$.Box>
              <$.Box ws:id="box3"></$.Box>
            </$.Slot>
            <$.Slot ws:id="slot2">
              {/* same ids */}
              <$.Box ws:id="box1"></$.Box>
              <$.Box ws:id="box2"></$.Box>
              <$.Box ws:id="box3"></$.Box>
            </$.Slot>
          </$.Body>
        ),
        sourceSelector: ["box1", "slot1", "body"],
        dropTarget: {
          parentSelector: ["slot2", "body"],
          position: 3,
        },
        assert: (data) => {
          const fragmentId = expectSlotsShareFragment(data.instances, [
            "slot1",
            "slot2",
          ]);
          expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
            { type: "id", value: "box2" },
            { type: "id", value: "box3" },
            { type: "id", value: "box1" },
          ]);
        },
      }),
      () => ({
        data: renderData(
          <$.Body ws:id="body">
            <$.Box ws:id="box"></$.Box>
            <$.Slot ws:id="slot1">
              <$.Fragment ws:id="fragment">
                <ws.element ws:tag="div" ws:id="div"></ws.element>
              </$.Fragment>
            </$.Slot>
            <$.Slot ws:id="slot2">
              {/* same ids */}
              <$.Fragment ws:id="fragment">
                <ws.element ws:tag="div" ws:id="div"></ws.element>
              </$.Fragment>
            </$.Slot>
          </$.Body>
        ),
        sourceSelector: ["box", "body"],
        dropTarget: {
          parentSelector: ["div", "fragment", "slot1", "body"],
          position: "end",
        },
        assert: (data) => {
          expectSlotsShareFragment(data.instances, ["slot1", "slot2"]);
          expect(data.instances.get("div")?.children).toEqual([
            { type: "id", value: "box" },
          ]);
        },
      }),
      () => ({
        data: renderData(
          <$.Body ws:id="body">
            <$.Slot ws:id="slot1">
              <$.Fragment ws:id="fragment">
                <$.Box ws:id="box"></$.Box>
                <$.Heading ws:id="heading"></$.Heading>
              </$.Fragment>
            </$.Slot>
            <$.Slot ws:id="slot2">
              {/* same ids */}
              <$.Fragment ws:id="fragment">
                <$.Box ws:id="box"></$.Box>
                <$.Heading ws:id="heading"></$.Heading>
              </$.Fragment>
            </$.Slot>
          </$.Body>
        ),
        sourceSelector: ["box", "fragment", "slot1", "body"],
        dropTarget: {
          parentSelector: ["body"],
          position: "end",
        },
        assert: (data) => {
          const fragmentId = expectSlotsShareFragment(data.instances, [
            "slot1",
            "slot2",
          ]);
          const movedBoxId = data.instances.get("body")?.children.at(-1)?.value;
          expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
            { type: "id", value: "heading" },
          ]);
          expect(movedBoxId).toBe("box");
        },
      }),
    ];

    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    for (let index = 0; index < 20; index += 1) {
      const operation = operations[Math.floor(random() * operations.length)]();
      reparentTestInstanceMutable(
        operation.data,
        operation.sourceSelector,
        operation.dropTarget
      );
      operation.assert(operation.data);
      expectSlotTreeIntegrity(operation.data.instances);
    }
  });

  test("slot operation sequence preserves integrity after normalize, reparent out, and delete", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same visible content in legacy direct-child shape */}
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Box ws:id="outside"></$.Box>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["heading", "slot2", "body"], {
      parentSelector: ["slot2", "body"],
      position: 0,
    });

    const sharedFragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    expect(data.instances.get(sharedFragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
    ]);
    expectSlotTreeIntegrity(data.instances);

    const movedSelector = reparentTestInstanceMutable(
      data,
      ["box", "fragment", "slot2", "body"],
      {
        parentSelector: ["outside", "body"],
        position: "end",
      }
    );

    expect(movedSelector).toEqual(expect.any(Array));
    expectSlotTreeIntegrity(data.instances, {
      selectedInstanceSelector: movedSelector,
    });
    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);

    const movedId = data.instances.get("outside")?.children[0]?.value;
    expect(movedId).toBe(movedSelector?.[0]);
  });

  test("reparent nested shared slot child outside removes it from all slot occurrences", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(
      data,
      ["box", "div", "fragment", "slot1", "body"],
      {
        parentSelector: ["body"],
        position: "end",
      }
    );

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    const slot1DivId = data.instances.get(fragmentId ?? "")?.children[0]?.value;
    const bodyChildId = data.instances.get("body")?.children.at(-1)?.value;

    expect(fragmentId).toBe("fragment");
    expect(data.instances.get(slot1DivId ?? "")?.children).toEqual([]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect(data.instances.get("div")?.children).toEqual([]);
    expect(bodyChildId).toBe("box");
  });

  test("reparent shared slot child outside preserves moved scoped data and resources", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="card">
              <$.Box ws:id="label"></$.Box>
            </ws.element>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="card">
              <$.Box ws:id="label"></$.Box>
            </ws.element>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    data.dataSources.set("cardVariable", {
      id: "cardVariable",
      scopeInstanceId: "card",
      type: "variable",
      name: "Card Variable",
      value: { type: "string", value: "value" },
    });
    data.props.set("labelProp", {
      id: "labelProp",
      instanceId: "label",
      name: "children",
      type: "expression",
      value: "$ws$dataSource$cardVariable",
    });
    data.props.set("cardResourceProp", {
      id: "cardResourceProp",
      instanceId: "card",
      name: "resource",
      type: "resource",
      value: "cardResource",
    });
    data.resources.set("cardResource", {
      id: "cardResource",
      name: "Card Resource",
      method: "get",
      url: "$ws$dataSource$cardVariable",
      headers: [
        {
          name: "authorization",
          value: "$ws$dataSource$cardVariable",
        },
      ],
      searchParams: [
        {
          name: "query",
          value: "$ws$dataSource$cardVariable",
        },
      ],
    });
    const style = createStyleDecl("cardStyle", "base", "color", "red");
    data.breakpoints.set("base", { id: "base", label: "Base" });
    data.styleSources.set("cardStyle", { id: "cardStyle", type: "local" });
    data.styleSourceSelections.set("card", {
      instanceId: "card",
      values: ["cardStyle"],
    });
    data.styles.set(getStyleDeclKey(style), style);
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["card", "fragment", "slot1", "body"], {
      parentSelector: ["body"],
      position: "end",
    });

    const slotFragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    const movedCardId = data.instances.get("body")?.children.at(-1)?.value;
    const movedLabelId =
      movedCardId === undefined
        ? undefined
        : data.instances.get(movedCardId)?.children[0]?.value;
    const movedCardVariable = Array.from(data.dataSources.values()).find(
      (dataSource) => dataSource.scopeInstanceId === movedCardId
    );
    const movedCardResourceId = Array.from(data.props.values()).find(
      (prop) => prop.instanceId === movedCardId && prop.type === "resource"
    )?.value;
    const movedCardResource =
      typeof movedCardResourceId !== "string"
        ? undefined
        : data.resources.get(movedCardResourceId);
    expect(movedCardVariable).toBeDefined();
    const movedCardVariableExpression = "$ws$dataSource$cardVariable";
    expect(slotFragmentId).toBe("fragment");
    expect(data.instances.get(slotFragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect(movedCardId).toBe("card");
    expect(movedLabelId).toBe("label");
    expect(movedCardVariable?.id).toBe("cardVariable");
    expect(
      Array.from(data.props.values()).find(
        (prop) => prop.instanceId === movedLabelId && prop.type === "expression"
      )?.value
    ).toBe(movedCardVariableExpression);
    expect(movedCardResourceId).toBe("cardResource");
    expect(movedCardResource?.url).toBe(movedCardVariableExpression);
    expect(movedCardResource?.headers).toEqual([
      {
        name: "authorization",
        value: movedCardVariableExpression,
      },
    ]);
    expect(movedCardResource?.searchParams).toEqual([
      {
        name: "query",
        value: movedCardVariableExpression,
      },
    ]);
    expect(data.styleSourceSelections.get(movedCardId ?? "")?.values).toEqual([
      "cardStyle",
    ]);
    expect(data.styles.size).toBe(1);
  });

  test("reparent shared slot child outside removes it from all slots and preserves siblings", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["box", "fragment", "slot1", "body"], {
      parentSelector: ["body"],
      position: "end",
    });

    const slotFragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    const bodyChildId = data.instances.get("body")?.children.at(-1)?.value;

    expect(slotFragmentId).toBe("fragment");
    expect(data.instances.get(slotFragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect(bodyChildId).toBe("box");
  });

  test("reparent direct slot child outside updates all linked slot occurrences", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["div", "fragment", "slot1", "body"], {
      parentSelector: ["body"],
      position: "end",
    });

    const fragmentId = expectSlotsShareFragment(data.instances, [
      "slot1",
      "slot2",
    ]);
    expect(data.instances.get(fragmentId ?? "")?.children).toEqual([]);
    expect(data.instances.get("body")?.children.at(-1)?.type).toBe("id");
    expect(data.instances.get("body")?.children.at(-1)?.value).toBe("div");
  });

  test("prevent slot reparenting into own children to avoid infinite loop", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot">
          <$.Fragment ws:id="fragment"></$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(data, ["slot", "body"], {
      parentSelector: ["fragment", "slot", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot">
            <$.Fragment ws:id="fragment"></$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("from collection item", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <ws.collection ws:id="collection">
          <$.Box ws:id="box"></$.Box>
        </ws.collection>
      </$.Body>
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentTestInstanceMutable(
      data,
      ["box", "collection[0]", "collection", "body"],
      { parentSelector: ["body"], position: "end" }
    );
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <ws.collection ws:id="collection"></ws.collection>
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
  });

  test("unsets variables scoped outside of moved subtree", () => {
    const data = getWebstudioDataStub({
      instances: createParentChildInstances([
        { type: "expression", value: "$ws$dataSource$parentVariable" },
      ]),
      dataSources: new Map([["parentVariable", parentScopedVariable]]),
    });
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["child", "parent", "body"], {
      parentSelector: ["body"],
      position: "end",
    });

    expect(data.instances.get("child")?.children).toEqual([
      { type: "expression", value: "Parent$32$Variable" },
    ]);
  });

  test("remaps moved expression props, action props, and resource expressions", () => {
    const data = getWebstudioDataStub({
      instances: createParentChildInstances(),
      dataSources: new Map([
        ["parentVariable", parentScopedVariable],
      ] satisfies [DataSource["id"], DataSource][]),
      props: new Map([
        [
          "expressionProp",
          {
            id: "expressionProp",
            instanceId: "child",
            name: "state",
            type: "expression",
            value: "$ws$dataSource$parentVariable",
          },
        ],
        [
          "actionProp",
          {
            id: "actionProp",
            instanceId: "child",
            name: "onClick",
            type: "action",
            value: [
              {
                type: "execute",
                args: [],
                code: "$ws$dataSource$parentVariable = 'next'",
              },
            ],
          },
        ],
        [
          "resourceProp",
          {
            id: "resourceProp",
            instanceId: "child",
            name: "resource",
            type: "resource",
            value: "resource",
          },
        ],
      ] satisfies [Prop["id"], Prop][]),
      resources: new Map([
        [
          "resource",
          {
            id: "resource",
            name: "Resource",
            method: "post",
            url: "$ws$dataSource$parentVariable",
            headers: [
              {
                name: "authorization",
                value: "$ws$dataSource$parentVariable",
              },
            ],
            searchParams: [
              {
                name: "query",
                value: "$ws$dataSource$parentVariable",
              },
            ],
            body: "$ws$dataSource$parentVariable",
          },
        ],
      ] satisfies [Resource["id"], Resource][]),
    });
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["child", "parent", "body"], {
      parentSelector: ["body"],
      position: "end",
    });

    expect(data.props.get("expressionProp")).toEqual({
      id: "expressionProp",
      instanceId: "child",
      name: "state",
      type: "expression",
      value: "Parent$32$Variable",
    });
    expect(data.props.get("actionProp")).toEqual({
      id: "actionProp",
      instanceId: "child",
      name: "onClick",
      type: "action",
      value: [
        {
          type: "execute",
          args: [],
          code: "Parent$32$Variable = 'next'",
        },
      ],
    });
    expect(data.resources.get("resource")).toEqual({
      id: "resource",
      name: "Resource",
      method: "post",
      url: "Parent$32$Variable",
      headers: [{ name: "authorization", value: "Parent$32$Variable" }],
      searchParams: [{ name: "query", value: "Parent$32$Variable" }],
      body: "Parent$32$Variable",
    });
  });

  test("restores moved expressions to same-name variables in new scope", () => {
    const data = getWebstudioDataStub({
      instances: new Map([
        [
          "body",
          {
            type: "instance",
            id: "body",
            component: "Body",
            children: [
              { type: "id", value: "source" },
              { type: "id", value: "target" },
            ],
          },
        ],
        [
          "source",
          {
            type: "instance",
            id: "source",
            component: "Box",
            children: [{ type: "id", value: "child" }],
          },
        ],
        [
          "target",
          {
            type: "instance",
            id: "target",
            component: "Box",
            children: [],
          },
        ],
        [
          "child",
          {
            type: "instance",
            id: "child",
            component: "Box",
            children: [
              { type: "expression", value: "$ws$dataSource$sourceVariable" },
            ],
          },
        ],
      ]),
      dataSources: new Map([
        [
          "sourceVariable",
          {
            id: "sourceVariable",
            scopeInstanceId: "source",
            type: "variable",
            name: "Shared Name",
            value: { type: "string", value: "source" },
          },
        ],
        [
          "targetVariable",
          {
            id: "targetVariable",
            scopeInstanceId: "target",
            type: "variable",
            name: "Shared Name",
            value: { type: "string", value: "target" },
          },
        ],
      ] satisfies [DataSource["id"], DataSource][]),
    });
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    reparentTestInstanceMutable(data, ["child", "source", "body"], {
      parentSelector: ["target", "body"],
      position: "end",
    });

    expect(data.instances.get("child")?.children).toEqual([
      { type: "expression", value: "$ws$dataSource$targetVariable" },
    ]);
  });

  test("move required child within same instance", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Tooltip ws:id="tooltip">
          <$.TooltipTrigger ws:id="trigger"></$.TooltipTrigger>
          <$.TooltipContent ws:id="content"></$.TooltipContent>
        </$.Tooltip>
      </$.Body>
    );
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...defaultMetas, ...radixMetas }))
    );
    reparentTestInstanceMutable(data, ["trigger", "tooltip", "body"], {
      parentSelector: ["tooltip", "body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Tooltip ws:id="tooltip">
            <$.TooltipContent ws:id="content"></$.TooltipContent>
            <$.TooltipTrigger ws:id={expect.any(String)}></$.TooltipTrigger>
          </$.Tooltip>
        </$.Body>
      ).instances
    );
  });
});

const getWebstudioDataStub = (
  data?: Partial<WebstudioData>
): WebstudioData => ({
  pages: createDefaultPages({ rootInstanceId: "" }),
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSourceSelections: new Map(),
  styleSources: new Map(),
  styles: new Map(),
  ...data,
});

const createParentChildInstances = (childChildren: Instance["children"] = []) =>
  new Map<Instance["id"], Instance>([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "id", value: "parent" }],
      },
    ],
    [
      "parent",
      {
        type: "instance",
        id: "parent",
        component: "Box",
        children: [{ type: "id", value: "child" }],
      },
    ],
    [
      "child",
      {
        type: "instance",
        id: "child",
        component: "Box",
        children: childChildren,
      },
    ],
  ]);

const parentScopedVariable: DataSource = {
  id: "parentVariable",
  scopeInstanceId: "parent",
  type: "variable",
  name: "Parent Variable",
  value: { type: "string", value: "value" },
};

describe("wrap in", () => {
  test("wrap instance in link", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    wrapInstance(elementComponent, "a");
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a" ws:id={expect.any(String)}>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
          </ws.element>
        </ws.element>
      ).instances
    );
  });

  test("wrap image in element", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="img" ws:id="imageId"></ws.element>
        </ws.element>
      ).instances
    );
    selectInstance(["imageId", "bodyId"]);
    wrapInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id={expect.any(String)}>
            <ws.element ws:tag="img" ws:id="imageId"></ws.element>
          </ws.element>
        </ws.element>
      ).instances
    );
  });

  test("wrap shared slot child in shared slot content", () => {
    $registeredComponentMetas.set(defaultMetasMap);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <ws.element ws:tag="div" ws:id="div"></ws.element>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <ws.element ws:tag="div" ws:id="div"></ws.element>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectInstance(["div", "fragment", "slot1", "bodyId"]);

    wrapInstance(elementComponent, "div");

    const wrapperId = $instances.get().get("fragment")?.children[0]?.value;
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: wrapperId },
    ]);
    expect($instances.get().get(wrapperId ?? "")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
  });

  test("wrap legacy shared slot child in shared slot content", () => {
    $registeredComponentMetas.set(defaultMetasMap);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <ws.element ws:tag="div" ws:id="div"></ws.element>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectInstance(["div", "slot1", "bodyId"]);

    wrapInstance(elementComponent, "div");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const wrapperId = $instances.get().get(fragmentId ?? "")
      ?.children[0]?.value;
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: wrapperId },
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().get(wrapperId ?? "")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
  });

  test("wrap shared slot child preserves shared siblings", () => {
    $registeredComponentMetas.set(defaultMetasMap);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <ws.element ws:tag="div" ws:id="div"></ws.element>
              <$.Heading ws:id="heading"></$.Heading>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <ws.element ws:tag="div" ws:id="div"></ws.element>
              <$.Heading ws:id="heading"></$.Heading>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectInstance(["div", "fragment", "slot1", "bodyId"]);

    wrapInstance(elementComponent, "div");

    const wrapperId = $instances.get().get("fragment")?.children[0]?.value;
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: wrapperId },
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().get(wrapperId ?? "")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
  });

  test.each([
    {
      selectedId: "box",
      expectedSiblingIds: [expect.any(String), "heading"],
    },
    {
      selectedId: "heading",
      expectedSiblingIds: ["box", expect.any(String)],
    },
  ])(
    "wrap direct shared slot child in $selectedId position preserves sibling order",
    ({ selectedId, expectedSiblingIds }) => {
      $registeredComponentMetas.set(defaultMetasMap);
      $instances.set(
        renderData(
          <$.Body ws:id="bodyId">
            <$.Slot ws:id="slot1">
              <$.Fragment ws:id="fragment">
                <$.Box ws:id="box"></$.Box>
                <$.Heading ws:id="heading"></$.Heading>
              </$.Fragment>
            </$.Slot>
            <$.Slot ws:id="slot2">
              {/* same ids */}
              <$.Fragment ws:id="fragment">
                <$.Box ws:id="box"></$.Box>
                <$.Heading ws:id="heading"></$.Heading>
              </$.Fragment>
            </$.Slot>
          </$.Body>
        ).instances
      );
      selectInstance([selectedId, "fragment", "slot1", "bodyId"]);

      wrapInstance(elementComponent, "div");

      const wrapperId = $instances
        .get()
        .get("fragment")
        ?.children.find(
          (child) =>
            child.type === "id" &&
            child.value !== "box" &&
            child.value !== "heading"
        )?.value;
      expect($instances.get().get("slot1")?.children).toEqual([
        { type: "id", value: "fragment" },
      ]);
      expect($instances.get().get("slot2")?.children).toEqual([
        { type: "id", value: "fragment" },
      ]);
      expect($instances.get().get("fragment")?.children).toEqual(
        expectedSiblingIds.map((value) => ({ type: "id", value }))
      );
      expect(wrapperId).toEqual(expect.any(String));
      expect($instances.get().get(wrapperId ?? "")?.children).toEqual([
        { type: "id", value: selectedId },
      ]);
    }
  );

  test("wrap nested shared slot child in shared slot content", () => {
    $registeredComponentMetas.set(defaultMetasMap);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <ws.element ws:tag="div" ws:id="div">
                <$.Box ws:id="box"></$.Box>
              </ws.element>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <ws.element ws:tag="div" ws:id="div">
                <$.Box ws:id="box"></$.Box>
              </ws.element>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "div", "fragment", "slot1", "bodyId"]);

    wrapInstance(elementComponent, "div");

    const wrapperId = $instances.get().get("div")?.children[0]?.value;
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
      { type: "id", value: wrapperId },
    ]);
    expect($instances.get().get(wrapperId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("avoid wrapping text with link in link", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="p" ws:id="textId">
          <ws.element ws:tag="a" ws:id="linkId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["textId", "bodyId"]);
    wrapInstance(elementComponent, "a");
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping textual content", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          <ws.element ws:tag="bold" ws:id="boldId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["boldId", "textId", "bodyId"]);
    wrapInstance(elementComponent);
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping list item", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="ul" ws:id="listId">
          <ws.element ws:tag="li" ws:id="listItemId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["listItemId", "listId", "bodyId"]);
    wrapInstance(elementComponent);
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });
});

describe("toggleInstanceShow", () => {
  test("creates show prop with false value when it doesn't exist", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(new Map());
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    const props = $props.get();
    const showProp = Array.from(props.values()).find(
      (prop) => prop.instanceId === "box" && prop.name === showAttribute
    );
    expect(showProp).toEqual({
      id: expect.any(String),
      instanceId: "box",
      name: showAttribute,
      type: "boolean",
      value: false,
    });
  });

  test("toggles show prop from true to false", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box" ws:show={true}></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    const updatedProps = $props.get();
    const showProp = Array.from(updatedProps.values()).find(
      (prop) => prop.instanceId === "box" && prop.name === showAttribute
    );
    expect(showProp?.type).toBe("boolean");
    if (showProp?.type === "boolean") {
      expect(showProp.value).toBe(false);
    }
  });

  test("toggles show prop from false to true", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box" ws:show={false}></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    const updatedProps = $props.get();
    const showProp = Array.from(updatedProps.values()).find(
      (prop) => prop.instanceId === "box" && prop.name === showAttribute
    );
    expect(showProp?.type).toBe("boolean");
    if (showProp?.type === "boolean") {
      expect(showProp.value).toBe(true);
    }
  });

  test("preserves non-boolean show prop", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box" ws:show={expression`isVisible`}></$.Box>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    toggleInstanceShow("box");

    expect($props.get()).toEqual(props);
  });
});

describe("unwrap instance", () => {
  test("unwrap command skips hidden slot fragment", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["div", "fragment", "slot", "body"]);

    unwrapInstance();

    expect($selectedInstanceSelector.get()).toEqual(["div", "body"]);
    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().has("slot")).toBe(false);
    expect($instances.get().has("fragment")).toBe(false);
  });

  test("unwrap command moves only shared slot child out of all slot occurrences", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["div", "fragment", "slot1", "body"]);

    unwrapInstance();

    const bodyChildren = $instances.get().get("body")?.children;
    const unwrappedDivId =
      bodyChildren?.[0]?.type === "id" ? bodyChildren[0].value : undefined;

    expect(unwrappedDivId).toBeDefined();
    expect(unwrappedDivId).toBe("div");
    expect($selectedInstanceSelector.get()).toEqual([unwrappedDivId, "body"]);
    expect($instances.get().get("slot1")).toBeUndefined();
    const fragmentId = getSlotFragmentId($instances.get(), "slot2");
    expect(fragmentId).toBe("fragment");
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([]);
  });

  test("unwrap command moves direct shared slot child out of all slots and preserves siblings", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "fragment", "slot1", "body"]);

    unwrapInstance();

    const bodyChildren = $instances.get().get("body")?.children;
    const slot1Id = bodyChildren?.find(
      (child) => child.type === "id" && child.value === "slot1"
    )?.value;
    const unwrappedBoxId = bodyChildren?.find(
      (child) =>
        child.type === "id" &&
        child.value !== "slot1" &&
        child.value !== "slot2"
    )?.value;
    const slot1FragmentId =
      slot1Id === undefined
        ? undefined
        : $instances.get().get(slot1Id)?.children[0]?.value;

    expect(slot1Id).toBe("slot1");
    const sharedFragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect(slot1FragmentId).toBe(sharedFragmentId);
    expect(unwrappedBoxId).toBeDefined();
    expect(unwrappedBoxId).toBe("box");
    expect($selectedInstanceSelector.get()).toEqual([unwrappedBoxId, "body"]);
    expect($instances.get().get(sharedFragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("unwrap command moves direct legacy shared slot child out of all slots and preserves siblings", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "slot1", "body"]);

    unwrapInstance();

    const bodyChildren = $instances.get().get("body")?.children;
    const slot1Id =
      bodyChildren?.[0]?.type === "id" ? bodyChildren[0].value : undefined;
    const unwrappedBoxId =
      bodyChildren?.[1]?.type === "id" ? bodyChildren[1].value : undefined;
    const sharedFragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const slot1FragmentId =
      slot1Id === undefined
        ? undefined
        : getSlotFragmentId($instances.get(), slot1Id);

    expect(slot1Id).toBe("slot1");
    expect(slot1FragmentId).toBe(sharedFragmentId);
    expect(unwrappedBoxId).toBeDefined();
    expect(unwrappedBoxId).toBe("box");
    expect($selectedInstanceSelector.get()).toEqual([unwrappedBoxId, "body"]);
    expect($instances.get().get(sharedFragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test.each([
    {
      selectedId: "box1",
      remainingIds: ["box2", "box3"],
    },
    {
      selectedId: "box2",
      remainingIds: ["box1", "box3"],
    },
    {
      selectedId: "box3",
      remainingIds: ["box1", "box2"],
    },
  ])(
    "unwrap command moves direct shared slot child in $selectedId position out of all slots",
    ({ selectedId, remainingIds }) => {
      const { instances, props } = renderData(
        <$.Body ws:id="body">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box1"></$.Box>
              <$.Box ws:id="box2"></$.Box>
              <$.Box ws:id="box3"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box1"></$.Box>
              <$.Box ws:id="box2"></$.Box>
              <$.Box ws:id="box3"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      );
      $instances.set(instances);
      $props.set(props);
      const pages = createDefaultPages({ rootInstanceId: "body" });
      $pages.set(pages);
      $selectedPageId.set(pages.homePageId);
      selectInstance([selectedId, "fragment", "slot1", "body"]);

      unwrapInstance();

      const bodyChildren = $instances.get().get("body")?.children ?? [];
      const unwrappedId = bodyChildren.find(
        (child) =>
          child.type === "id" &&
          child.value !== "slot1" &&
          child.value !== "slot2"
      )?.value;
      const sharedFragmentId = expectSlotsShareFragment($instances.get(), [
        "slot1",
        "slot2",
      ]);
      expect(unwrappedId).toBe(selectedId);
      expect($selectedInstanceSelector.get()).toEqual([unwrappedId, "body"]);
      expect($instances.get().get(sharedFragmentId ?? "")?.children).toEqual(
        remainingIds.map((id) => ({ type: "id", value: id }))
      );
    }
  );

  test("unwrap command keeps nested shared slot child in shared slot content", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "div", "fragment", "slot1", "body"]);

    unwrapInstance();

    expect($selectedInstanceSelector.get()).toEqual([
      "box",
      "fragment",
      "slot1",
      "body",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
    expect($instances.get().has("div")).toBe(false);
  });

  test("unwrap command keeps nested shared slot child with siblings in shared slot content", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
              <$.Heading ws:id="heading"></$.Heading>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
              <$.Heading ws:id="heading"></$.Heading>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "div", "fragment", "slot1", "body"]);

    unwrapInstance();

    expect($selectedInstanceSelector.get()).toEqual([
      "box",
      "fragment",
      "slot1",
      "body",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
      { type: "id", value: "box" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });
});

describe("canUnwrapInstance", () => {
  beforeEach(() => {
    $project.set({ id: "projectId" } as Project);
    $registeredComponentMetas.set(defaultMetasMap);
  });

  test("returns true for unwrappable instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="wrapper">
            <$.Box ws:id="child"></$.Box>
          </$.Box>
        </$.Box>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);

    const instancePath = [
      {
        instanceSelector: ["wrapper", "parent", "body"],
        instance: instances.get("wrapper")!,
      },
      {
        instanceSelector: ["parent", "body"],
        instance: instances.get("parent")!,
      },
      {
        instanceSelector: ["body"],
        instance: instances.get("body")!,
      },
    ] satisfies InstancePath;

    expect(canUnwrapInstance(instancePath)).toBe(true);
  });

  test("returns false if parent is root instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    $registeredComponentMetas.set(defaultMetasMap);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);

    const instancePath = [
      {
        instanceSelector: ["box", "body"],
        instance: instances.get("box")!,
      },
      {
        instanceSelector: ["body"],
        instance: instances.get("body")!,
      },
    ] satisfies InstancePath;

    expect(canUnwrapInstance(instancePath)).toBe(false);
  });

  test("returns false for textual instance", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Paragraph ws:id="paragraph">
          <$.Bold ws:id="bold">text</$.Bold>
        </$.Paragraph>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    $registeredComponentMetas.set(defaultMetasMap);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);

    const instancePath = [
      {
        instanceSelector: ["bold", "paragraph", "body"],
        instance: instances.get("bold")!,
      },
      {
        instanceSelector: ["paragraph", "body"],
        instance: instances.get("paragraph")!,
      },
    ] satisfies InstancePath;

    expect(canUnwrapInstance(instancePath)).toBe(false);
  });

  test("returns true for Body > div > a scenario", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <ws.element ws:tag="div" ws:id="div">
          <ws.element ws:tag="a" ws:id="link">
            Link text
          </ws.element>
        </ws.element>
      </$.Body>
    );

    $instances.set(instances);
    $props.set(props);
    $registeredComponentMetas.set(defaultMetasMap);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);

    const instancePath = [
      {
        instanceSelector: ["link", "div", "body"],
        instance: instances.get("link")!,
      },
      {
        instanceSelector: ["div", "body"],
        instance: instances.get("div")!,
      },
      {
        instanceSelector: ["body"],
        instance: instances.get("body")!,
      },
    ] satisfies InstancePath;

    // Should be able to unwrap the link from the div
    expect(canUnwrapInstance(instancePath)).toBe(true);
  });
});

describe("canConvertInstance", () => {
  test("returns true for valid conversion", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </ws.element>
    );

    const result = canConvertInstance({
      instanceId: "box",
      instanceSelector: ["box", "body"],
      component: elementComponent,
      tag: "div",
      instances,
      props,
      metas: defaultMetasMap,
    });

    expect(result).toBe(true);
  });

  test("returns false for non-existent instance", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body"></ws.element>
    );

    const result = canConvertInstance({
      instanceId: "nonexistent",
      instanceSelector: ["nonexistent", "body"],
      component: elementComponent,
      tag: "div",
      instances,
      props,
      metas: defaultMetasMap,
    });

    expect(result).toBe(false);
  });

  test("returns true when converting Box to Heading", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </ws.element>
    );

    const result = canConvertInstance({
      instanceId: "box",
      instanceSelector: ["box", "body"],
      component: "@webstudio-is/sdk-components-react:Heading",
      instances,
      props,
      metas: defaultMetasMap,
    });

    expect(result).toBe(true);
  });

  test("uses preset tag when available", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </ws.element>
    );

    const result = canConvertInstance({
      instanceId: "box",
      instanceSelector: ["box", "body"],
      component: "@webstudio-is/sdk-components-react:Heading",
      instances,
      props,
      metas: defaultMetasMap,
    });

    expect(result).toBe(true);
  });
});

describe("convertInstance", () => {
  beforeEach(() => {
    $registeredComponentMetas.set(defaultMetasMap);
  });

  test("detach shared slot children when converting slot", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["slot1", "body"]);

    convertInstance(elementComponent, "section");

    const convertedSlot = $instances.get().get("slot1");
    expect(convertedSlot?.component).toBe(elementComponent);
    expect(convertedSlot?.tag).toBe("section");
    expect(convertedSlot?.children).not.toEqual(
      $instances.get().get("slot2")?.children
    );
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
  });

  test("detach shared slot children with siblings when converting slot", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["slot1", "body"]);

    convertInstance(elementComponent, "section");

    const convertedSlot = $instances.get().get("slot1");
    const convertedFragmentId = convertedSlot?.children[0]?.value;
    expect(convertedSlot?.component).toBe(elementComponent);
    expect(convertedSlot?.tag).toBe("section");
    expect(convertedFragmentId).toBeDefined();
    expect(convertedFragmentId).not.toBe("fragment");
    expect($instances.get().get(convertedFragmentId ?? "")?.children).toEqual([
      { type: "id", value: expect.any(String) },
      { type: "id", value: expect.any(String) },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
    ]);
  });

  test("detach legacy shared slot children when converting slot", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["slot1", "body"]);

    convertInstance(elementComponent, "section");

    const convertedSlot = $instances.get().get("slot1");
    const convertedFragmentId = convertedSlot?.children[0]?.value;
    const slot2FragmentId = getSlotFragmentId($instances.get(), "slot2");
    expect(convertedSlot?.component).toBe(elementComponent);
    expect(convertedSlot?.tag).toBe("section");
    expect(convertedFragmentId).toBeDefined();
    expect(slot2FragmentId).toBeDefined();
    expect(convertedFragmentId).not.toBe(slot2FragmentId);
    expect($instances.get().get(convertedFragmentId ?? "")?.component).toBe(
      "Fragment"
    );
    expect($instances.get().get(convertedFragmentId ?? "")?.children).toEqual([
      { type: "id", value: expect.any(String) },
      { type: "id", value: expect.any(String) },
    ]);
    expect($instances.get().get(slot2FragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
    ]);
  });

  test("converts shared slot child in shared slot content", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["box", "fragment", "slot1", "body"]);

    convertInstance(elementComponent, "section");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
    expect($instances.get().get("box")?.component).toBe(elementComponent);
    expect($instances.get().get("box")?.tag).toBe("section");
  });

  test("converts legacy shared slot child in shared slot content", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["box", "slot1", "body"]);

    convertInstance(elementComponent, "section");

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
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().get("box")?.component).toBe(elementComponent);
    expect($instances.get().get("box")?.tag).toBe("section");
  });

  test("converts nested shared slot child in shared slot content", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["box", "div", "fragment", "slot1", "body"]);

    convertInstance(elementComponent, "section");

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
    ]);
    expect($instances.get().get("box")?.component).toBe(elementComponent);
    expect($instances.get().get("box")?.tag).toBe("section");
  });

  test("converts nested shared slot child and preserves siblings", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
              <$.Heading ws:id="heading"></$.Heading>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
              <$.Heading ws:id="heading"></$.Heading>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["box", "div", "fragment", "slot1", "body"]);

    convertInstance(elementComponent, "section");

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
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().get("box")?.component).toBe(elementComponent);
    expect($instances.get().get("box")?.tag).toBe("section");
  });

  test("command sequence preserves shared slot content through wrap, convert, and unwrap", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
            <$.Heading ws:id="heading"></$.Heading>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    $props.set(props);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "fragment", "slot1", "body"]);

    wrapInstance(elementComponent, "div");

    const wrapperId = $selectedInstanceSelector.get()?.[0];
    expect(wrapperId).toEqual(expect.any(String));
    if (wrapperId === undefined) {
      throw new Error("Expected wrapper to be selected");
    }
    expectSlotTreeIntegrity($instances.get(), {
      selectedInstanceSelector: $selectedInstanceSelector.get(),
    });
    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: wrapperId },
      { type: "id", value: "heading" },
    ]);

    convertInstance(elementComponent, "section");

    expect($instances.get().get(wrapperId)?.component).toBe(elementComponent);
    expect($instances.get().get(wrapperId)?.tag).toBe("section");
    expectSlotTreeIntegrity($instances.get(), {
      selectedInstanceSelector: $selectedInstanceSelector.get(),
    });
    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);

    selectInstance(["box", wrapperId, "fragment", "slot1", "body"]);
    unwrapInstance();

    expect($selectedInstanceSelector.get()).toEqual([
      "box",
      "fragment",
      "slot1",
      "body",
    ]);
    expectSlotTreeIntegrity($instances.get(), {
      selectedInstanceSelector: $selectedInstanceSelector.get(),
    });
    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().has(wrapperId)).toBe(false);
  });

  test("converts legacy tag to element", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <$.Box tag="article" ws:id="articleId"></$.Box>
      </ws.element>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["articleId", "bodyId"]);
    convertInstance(elementComponent);
    const { instances: newInstances, props: newProps } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="article" ws:id="articleId"></ws.element>
      </ws.element>
    );
    expect({ instances: $instances.get(), props: $props.get() }).toEqual({
      instances: newInstances,
      props: newProps,
    });
  });

  test("migrates legacy properties", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <$.Box
          ws:tag="div"
          ws:id="divId"
          className="my-class"
          htmlFor="my-id"
        ></$.Box>
      </ws.element>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["divId", "bodyId"]);
    convertInstance(elementComponent);
    const { instances: newInstances, props: newProps } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element
          ws:tag="div"
          ws:id="divId"
          class="my-class"
          for="my-id"
        ></ws.element>
      </ws.element>
    );
    expect({ instances: $instances.get(), props: $props.get() }).toEqual({
      instances: newInstances,
      props: newProps,
    });
  });

  test("preserves currently specified tag", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:tag="article" ws:id="articleId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["articleId", "bodyId"]);
    convertInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="article" ws:id="articleId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("converts to first tag from presets", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Heading ws:id="headingId"></$.Heading>
        </ws.element>
      ).instances
    );
    selectInstance(["headingId", "bodyId"]);
    convertInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="h1" ws:id="headingId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("falls back to div", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="divId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    convertInstance(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("converts with specific tag", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="divId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    convertInstance(elementComponent, "a");
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("converts between components", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["boxId", "bodyId"]);
    convertInstance("@webstudio-is/sdk-components-react:Heading");
    const result = $instances.get();
    const boxInstance = result.get("boxId");
    expect(boxInstance?.component).toBe(
      "@webstudio-is/sdk-components-react:Heading"
    );
  });

  test("prevents converting root instance", () => {
    const initialInstances = renderData(
      <ws.element ws:tag="html" ws:id="rootId">
        <ws.element ws:tag="body" ws:id="bodyId"></ws.element>
      </ws.element>
    ).instances;
    $instances.set(initialInstances);
    selectInstance(["rootId"]);
    convertInstance(elementComponent, "div");
    // Should not change
    expect($instances.get()).toEqual(initialInstances);
  });

  test("prevents converting body instance", () => {
    const pages = createDefaultPages({ rootInstanceId: "bodyId" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);

    const initialInstances = renderData(
      <ws.element ws:tag="html" ws:id="rootId">
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.element>
      </ws.element>
    ).instances;
    $instances.set(initialInstances);
    selectInstance(["bodyId", "rootId"]);
    convertInstance(elementComponent, "div");
    // Should not change
    expect($instances.get()).toEqual(initialInstances);
  });
});

describe("deleteSelectedInstance", () => {
  test("delete selected instance and select next one", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child1"></$.Box>
          <$.Box ws:id="child2"></$.Box>
          <$.Box ws:id="child3"></$.Box>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["child2", "parent", "body"]);
    deleteSelectedInstance();
    expect($selectedInstanceSelector.get()).toEqual([
      "child3",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select previous one", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child1"></$.Box>
          <$.Box ws:id="child2"></$.Box>
          <$.Box ws:id="child3"></$.Box>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["child3", "parent", "body"]);
    deleteSelectedInstance();
    expect($selectedInstanceSelector.get()).toEqual([
      "child2",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select parent one", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="parent">
          <$.Box ws:id="child1"></$.Box>
        </$.Box>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["child1", "parent", "body"]);
    deleteSelectedInstance();
    expect($selectedInstanceSelector.get()).toEqual(["parent", "body"]);
  });

  test("delete selected legacy shared slot child and select next normalized sibling", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
          <$.Heading ws:id="heading"></$.Heading>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "slot1", "body"]);

    deleteSelectedInstance();

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($selectedInstanceSelector.get()).toEqual([
      "heading",
      fragmentId,
      "slot1",
      "body",
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("delete last selected shared slot child and select visible slot occurrence", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <$.Box ws:id="box"></$.Box>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "fragment", "slot1", "body"]);

    deleteSelectedInstance();

    expect($selectedInstanceSelector.get()).toEqual(["slot1", "body"]);
    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("fragment")?.children).toEqual([]);
  });

  test("delete last selected legacy shared slot child and select visible slot occurrence", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Box ws:id="box"></$.Box>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Box ws:id="box"></$.Box>
        </$.Slot>
      </$.Body>
    );
    $instances.set(instances);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["box", "slot1", "body"]);

    deleteSelectedInstance();

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($selectedInstanceSelector.get()).toEqual(["slot1", "body"]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([]);
  });
});
