import { enableMapSet } from "immer";
import { expect, test, describe } from "vitest";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $instances,
  $selectedStyleSources,
  $styleSourceSelections,
  $styleSources,
} from "~/shared/nano-states";
import { addStyleSourceToInstance, __testing__ } from "./style-source-section";
import { $awareness } from "~/shared/awareness";

const { getComponentStates } = __testing__;

enableMapSet();
registerContainers();

describe("getComponentStates", () => {
  test("returns predefined states for tag", () => {
    const result = getComponentStates({
      predefinedStates: [":visited", ":active"],
      componentStates: [],
      instanceStyleSourceIds: new Set(),
      styles: [],
      selectedStyleState: undefined,
    });

    // Should include universal states (:hover, :focus, etc.) and tag-specific states
    expect(result.some((s) => s.selector === ":hover")).toBe(true);
    expect(result.some((s) => s.selector === ":visited")).toBe(true);
    expect(result.some((s) => s.selector === ":active")).toBe(true);
    expect(result.every((s) => s.source === "native")).toBe(true);
  });

  test("includes selectors from instance styles only", () => {
    const result = getComponentStates({
      predefinedStates: [],
      componentStates: [],
      instanceStyleSourceIds: new Set(["style1"]),
      styles: [
        { styleSourceId: "style1", state: "::before" },
        { styleSourceId: "other", state: "::after" },
      ],
      selectedStyleState: undefined,
    });

    // Should include ::before from instance's style source
    expect(result.some((s) => s.selector === "::before")).toBe(true);
    // Should NOT include ::after from other style source
    expect(result.some((s) => s.selector === "::after")).toBe(false);
  });

  test("marks custom selectors correctly", () => {
    const result = getComponentStates({
      predefinedStates: [],
      componentStates: [],
      instanceStyleSourceIds: new Set(["style1"]),
      styles: [{ styleSourceId: "style1", state: "::before" }],
      selectedStyleState: undefined,
    });

    const beforeSelector = result.find((s) => s.selector === "::before");
    expect(beforeSelector?.source).toBe("custom");
    expect(beforeSelector?.type).toBe("pseudoElement");
  });

  test("includes currently selected state even without styles", () => {
    const result = getComponentStates({
      predefinedStates: [],
      componentStates: [],
      instanceStyleSourceIds: new Set(),
      styles: [],
      selectedStyleState: "::marker",
    });

    expect(result.some((s) => s.selector === "::marker")).toBe(true);
  });

  test("includes component states", () => {
    const result = getComponentStates({
      predefinedStates: [],
      componentStates: [
        { label: "Open", selector: "[data-state=open]" },
        { label: "Closed", selector: "[data-state=closed]" },
      ],
      instanceStyleSourceIds: new Set(),
      styles: [],
      selectedStyleState: undefined,
    });

    const openState = result.find((s) => s.selector === "[data-state=open]");
    expect(openState?.source).toBe("component");
    expect(openState?.label).toBe("Open");
  });

  test("removes selector when styles are cleared", () => {
    // First, with styles
    const withStyles = getComponentStates({
      predefinedStates: [],
      componentStates: [],
      instanceStyleSourceIds: new Set(["style1"]),
      styles: [{ styleSourceId: "style1", state: "::before" }],
      selectedStyleState: undefined,
    });
    expect(withStyles.some((s) => s.selector === "::before")).toBe(true);

    // After clearing styles (empty styles array)
    const withoutStyles = getComponentStates({
      predefinedStates: [],
      componentStates: [],
      instanceStyleSourceIds: new Set(["style1"]),
      styles: [],
      selectedStyleState: undefined,
    });
    expect(withoutStyles.some((s) => s.selector === "::before")).toBe(false);
  });
});

test("add style source to instance", () => {
  $instances.set(
    new Map([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ])
  );
  $awareness.set({
    pageId: "",
    instanceSelector: ["body"],
  });
  $styleSources.set(new Map([["local1", { id: "local1", type: "local" }]]));
  $styleSourceSelections.set(new Map());
  $selectedStyleSources.set(new Map());

  addStyleSourceToInstance("token1");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1"],
  });
  expect($selectedStyleSources.get().get("body")).toEqual("token1");

  // put new style source last
  addStyleSourceToInstance("local1");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1", "local1"],
  });

  // put new token before local
  addStyleSourceToInstance("token2");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1", "token2", "local1"],
  });
});
