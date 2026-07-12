import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
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
});
