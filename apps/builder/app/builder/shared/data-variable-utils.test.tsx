import { beforeEach, expect, test } from "vitest";
import type { DataSource, Instance } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
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
  resetDataStores,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  deleteDataVariable,
  deleteUnusedDataVariables,
  validateDataVariableName,
} from "./data-variable-utils";

registerContainers();

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"] = []
): Instance => ({ type: "instance", id, component, children });

const createVariable = (
  id: string,
  name: string,
  scopeInstanceId?: string
): DataSource => ({
  id,
  scopeInstanceId,
  name,
  type: "variable",
  value: { type: "string", value: "" },
});

const setRuntimeBridgeStores = () => {
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $instances.set(new Map([["body", createInstance("body", "Body")]]));
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $assets.set(new Map());
};

beforeEach(() => {
  resetDataStores();
});

test("validateDataVariableName uses the current variable scope when renaming", () => {
  $dataSources.set(
    new Map([
      ["variable-1", createVariable("variable-1", "firstVariable", "box-1")],
      ["variable-2", createVariable("variable-2", "secondVariable", "box-1")],
      ["variable-3", createVariable("variable-3", "firstVariable", "box-2")],
    ])
  );

  expect(validateDataVariableName("firstVariable", "variable-2")).toEqual({
    type: "duplicate",
    message: "Name is already used by another variable on this instance",
  });
  expect(
    validateDataVariableName("firstVariable", "variable-3")
  ).toBeUndefined();
});

test("deleteDataVariable deletes through the runtime mutation bridge", () => {
  setRuntimeBridgeStores();
  $dataSources.set(
    new Map([["variable-1", createVariable("variable-1", "firstVariable")]])
  );

  deleteDataVariable("variable-1");

  expect($dataSources.get().has("variable-1")).toBe(false);
});

test("deleteUnusedDataVariables deletes unused variables through one runtime mutation", () => {
  setRuntimeBridgeStores();
  $dataSources.set(
    new Map([
      ["variable-1", createVariable("variable-1", "firstVariable")],
      ["variable-2", createVariable("variable-2", "secondVariable")],
    ])
  );

  expect(deleteUnusedDataVariables()).toBe(2);

  expect($dataSources.get().has("variable-1")).toBe(false);
  expect($dataSources.get().has("variable-2")).toBe(false);
});
