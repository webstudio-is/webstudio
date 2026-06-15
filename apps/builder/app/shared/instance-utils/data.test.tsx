import { describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { blockComponent, blockTemplateComponent } from "@webstudio-is/sdk";
import { canDeleteInstanceInContentMode } from "./data";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

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
