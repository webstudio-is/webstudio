import { describe, expect, test } from "vitest";
import { produce } from "immer";
import type { Instance } from "@webstudio-is/sdk";
import { blockComponent, blockTemplateComponent } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  canDeleteInstanceInContentMode,
  getWebstudioData,
  unwrap,
  updateWebstudioData,
} from "./data";
import { registerContainers } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

registerContainers();

describe("canDeleteInstanceInContentMode", () => {
  const instances = new Map([
    ["body", createInstance("body", "Body", [{ type: "id", value: "block" }])],
    [
      "block",
      createInstance("block", blockComponent, [
        { type: "id", value: "child" },
        { type: "id", value: "template" },
      ]),
    ],
    [
      "child",
      createInstance("child", "Box", [{ type: "id", value: "nested" }]),
    ],
    ["nested", createInstance("nested", "Box", [])],
    ["template", createInstance("template", blockTemplateComponent, [])],
  ]);

  test("allows deleting direct content block children", () => {
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["child", "block", "body"],
        instances,
      })
    ).toBe(true);
  });

  test("protects content block roots, nested descendants, and templates", () => {
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["nested", "child", "block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["template", "block", "body"],
        instances,
      })
    ).toBe(false);
  });
});

describe("data store helpers", () => {
  test("unwrap returns current value for immer drafts and original value otherwise", () => {
    const source = { count: 1 };
    expect(unwrap(source)).toBe(source);

    produce(source, (draft) => {
      draft.count = 2;
      expect(unwrap(draft)).toEqual({ count: 2 });
    });
  });

  test("getWebstudioData reads all instance-related stores", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([["body", createInstance("body", "Body", [])]]);
    $pages.set(pages);
    $instances.set(instances);
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    expect(getWebstudioData()).toMatchObject({
      pages,
      instances,
    });
  });

  test("updateWebstudioData mutates stores through a transaction", () => {
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $instances.set(new Map());
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    updateWebstudioData((data) => {
      data.instances.set("body", createInstance("body", "Body", []));
    });

    expect($instances.get().get("body")).toEqual(
      createInstance("body", "Body", [])
    );
  });
});
