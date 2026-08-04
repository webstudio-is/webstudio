import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instances,
} from "@webstudio-is/sdk";
import { isTextEditableInContentMode } from "./content-mode";

const instance = (id: string, component: string, childIds: string[] = []) => ({
  type: "instance" as const,
  id,
  component,
  children: childIds.map((value) => ({ type: "id" as const, value })),
});

describe("isTextEditableInContentMode", () => {
  const instances = new Map([
    ["body", instance("body", elementComponent, ["outside", "block"])],
    ["outside", instance("outside", elementComponent)],
    ["block", instance("block", blockComponent, ["inside", "templates"])],
    ["inside", instance("inside", elementComponent)],
    ["templates", instance("templates", blockTemplateComponent, ["source"])],
    ["source", instance("source", elementComponent)],
  ]);

  test("permits only Content Block descendants in content mode", () => {
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["inside", "block", "body"],
        instances,
      })
    ).toBe(true);
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["outside", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["source", "templates", "block", "body"],
        instances,
      })
    ).toBe(false);
  });

  test("does not restrict Design mode", () => {
    expect(
      isTextEditableInContentMode({
        isContentMode: false,
        instanceSelector: ["outside", "body"],
        instances,
      })
    ).toBe(true);
  });

  test("rejects bound text in Content mode without restricting Design mode", () => {
    const boundInstances: Instances = new Map(instances);
    boundInstances.set("bound", {
      type: "instance",
      id: "bound",
      component: elementComponent,
      children: [{ type: "expression", value: "value" }],
    });
    boundInstances.set("block", instance("block", blockComponent, ["bound"]));

    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["bound", "block", "body"],
        instances: boundInstances,
      })
    ).toBe(false);
    expect(
      isTextEditableInContentMode({
        isContentMode: false,
        instanceSelector: ["bound", "block", "body"],
        instances: boundInstances,
      })
    ).toBe(true);
  });
});
