import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  type Instance,
} from "@webstudio-is/sdk";
import {
  canDeleteInstanceInContentMode,
  findBlockChildSelector,
  findBlockSelector,
  findBlockTemplates,
  getBlockTemplateInsertionIndex,
} from "./block";

const createInstance = (
  id: Instance["id"],
  component: Instance["component"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

describe("block tree helpers", () => {
  test("finds block and block child selectors from nested anchors", () => {
    const instances = new Map<Instance["id"], Instance>([
      ["body", createInstance("body", "Body")],
      ["block", createInstance("block", blockComponent)],
      ["section", createInstance("section", "Box")],
    ]);

    expect(
      findBlockSelector({
        anchor: ["section", "block", "body"],
        instances,
      })
    ).toEqual(["block", "body"]);
    expect(
      findBlockChildSelector({
        instanceSelector: ["section", "block", "body"],
        instances,
      })
    ).toEqual(["section", "block", "body"]);
    expect(
      findBlockChildSelector({
        instanceSelector: ["block", "body"],
        instances,
      })
    ).toEqual(["block", "body"]);
  });

  test("finds template instances in a block", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
        ]),
      ],
      [
        "templates",
        createInstance("templates", blockTemplateComponent, [
          { type: "id", value: "hero" },
          { type: "id", value: "pricing" },
        ]),
      ],
      ["hero", createInstance("hero", "Box")],
      ["pricing", createInstance("pricing", "Box")],
    ]);

    expect(findBlockTemplates({ anchor: ["block"], instances })).toEqual([
      [instances.get("hero"), ["hero", "templates", "block"]],
      [instances.get("pricing"), ["pricing", "templates", "block"]],
    ]);
  });

  test("finds block template insertion index", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "templates" },
          { type: "id", value: "hero" },
          { type: "id", value: "pricing" },
        ]),
      ],
      ["templates", createInstance("templates", blockTemplateComponent)],
      ["hero", createInstance("hero", "Box")],
      ["pricing", createInstance("pricing", "Box")],
    ]);

    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["block"],
        instances,
      })
    ).toBe(1);
    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["pricing", "block"],
        instances,
        insertBefore: true,
      })
    ).toBe(2);
    expect(
      getBlockTemplateInsertionIndex({
        anchor: ["pricing", "block"],
        instances,
      })
    ).toBe(3);
  });

  test("allows deleting direct content block children", () => {
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "block" }]),
      ],
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
      ["nested", createInstance("nested", "Box")],
      ["template", createInstance("template", blockTemplateComponent)],
    ]);

    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["child", "block", "body"],
        instances,
      })
    ).toBe(true);
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
