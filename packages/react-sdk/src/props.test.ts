import { describe, test, expect } from "@jest/globals";
import { resolveUrlProp, type Pages, type PropsByInstanceId } from "./props";
import type { Page, Prop } from "@webstudio-is/project-build";

const unique = () => Math.random().toString();

describe("resolveUrlProp", () => {
  const instanceId = unique();

  const page1: Page = {
    id: unique(),
    path: `/${unique()}`,
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "0",
  };

  const page2: Page = {
    id: unique(),
    path: `/${unique()}`,
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "0",
  };

  const pageByIdProp: Prop = {
    type: "page",
    id: unique(),
    instanceId,
    name: unique(),
    value: page1.id,
  };

  const pageByPathProp: Prop = {
    type: "string",
    id: unique(),
    instanceId,
    name: unique(),
    value: page2.path,
  };

  const arbitraryUrlProp: Prop = {
    type: "string",
    id: unique(),
    instanceId,
    name: unique(),
    value: unique(),
  };

  const propsByInstanceId: PropsByInstanceId = new Map([
    [instanceId, [pageByIdProp, pageByPathProp, arbitraryUrlProp]],
  ]);

  const pages: Pages = new Map([
    [page1.id, page1],
    [page2.id, page2],
  ]);

  test("if instanceId is unknown returns undefined", () => {
    expect(
      resolveUrlProp("unknown", pageByIdProp.name, propsByInstanceId, pages)
    ).toBeUndefined();
  });

  test("if prop name is unknown returns undefined", () => {
    expect(
      resolveUrlProp(instanceId, "unknown", propsByInstanceId, pages)
    ).toBeUndefined();
  });

  test("page by id", () => {
    expect(
      resolveUrlProp(instanceId, pageByIdProp.name, propsByInstanceId, pages)
    ).toBe(page1);
  });

  test("page by path", () => {
    expect(
      resolveUrlProp(instanceId, pageByPathProp.name, propsByInstanceId, pages)
    ).toBe(page2);
  });

  test("arbitrary url", () => {
    expect(
      resolveUrlProp(
        instanceId,
        arbitraryUrlProp.name,
        propsByInstanceId,
        pages
      )
    ).toBe(arbitraryUrlProp.value);
  });
});
