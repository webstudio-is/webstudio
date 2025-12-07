import { expect, test } from "vitest";
import { atom } from "nanostores";
import { $dataSources } from "~/shared/nano-states";
import { validateDataVariableName } from "./data-variable-utils";
import type { DataSources } from "@webstudio-is/sdk";

// Mock the nano-states module
const mockDataSources = atom<DataSources>(new Map());

// Replace the actual store with our mock
Object.defineProperty($dataSources, "get", {
  value: () => mockDataSources.get(),
});

test("validateDataVariableName returns required error for empty name", () => {
  mockDataSources.set(new Map());

  const error = validateDataVariableName("");
  expect(error?.type).toBe("required");
  expect(error?.message).toBe("Variable name is required");
});

test("validateDataVariableName returns required error for whitespace-only name", () => {
  mockDataSources.set(new Map());

  const error = validateDataVariableName("   ");
  expect(error?.type).toBe("required");
});

test("validateDataVariableName returns undefined for valid unique name", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "existingVariable",
          type: "variable",
        },
      ],
    ])
  );

  const error = validateDataVariableName("newVariable");
  expect(error).toBeUndefined();
});

test("validateDataVariableName returns duplicate error when name exists on same instance", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "myVariable",
          type: "variable",
        },
      ],
      [
        "var2",
        {
          id: "var2",
          scopeInstanceId: "instance1",
          name: "otherVariable",
          type: "variable",
        },
      ],
    ])
  );

  // Creating a new variable with existing name on same instance
  const error = validateDataVariableName("myVariable", "var2");
  expect(error?.type).toBe("duplicate");
});

test("validateDataVariableName allows same name on different instances", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "myVariable",
          type: "variable",
        },
      ],
      [
        "var2",
        {
          id: "var2",
          scopeInstanceId: "instance2",
          name: "otherVariable",
          type: "variable",
        },
      ],
    ])
  );

  // Creating a variable on instance2 with name that exists on instance1
  const error = validateDataVariableName("myVariable", "var2");
  expect(error).toBeUndefined();
});

test("validateDataVariableName allows renaming variable to same name", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "myVariable",
          type: "variable",
        },
      ],
    ])
  );

  // Renaming var1 to its current name
  const error = validateDataVariableName("myVariable", "var1");
  expect(error).toBeUndefined();
});

test("validateDataVariableName returns duplicate error when renaming to existing name on same instance", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "firstVariable",
          type: "variable",
        },
      ],
      [
        "var2",
        {
          id: "var2",
          scopeInstanceId: "instance1",
          name: "secondVariable",
          type: "variable",
        },
      ],
    ])
  );

  // Renaming var2 to var1's name on same instance
  const error = validateDataVariableName("firstVariable", "var2");
  expect(error?.type).toBe("duplicate");
});

test("validateDataVariableName ignores non-variable data sources", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "myVariable",
          type: "variable",
        },
      ],
      [
        "resource1",
        {
          id: "resource1",
          scopeInstanceId: "instance1",
          name: "myResource",
          type: "resource",
          resourceId: "res1",
        },
      ],
    ])
  );

  // Creating a variable with same name as resource should be allowed
  const error = validateDataVariableName("myResource");
  expect(error).toBeUndefined();
});

test("validateDataVariableName validates for new variables without variableId", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: "instance1",
          name: "existingVariable",
          type: "variable",
        },
      ],
    ])
  );

  // Creating a new variable (no variableId) with existing name on same instance
  const error = validateDataVariableName(
    "existingVariable",
    undefined,
    "instance1"
  );
  expect(error?.type).toBe("duplicate");
});

test("validateDataVariableName handles undefined scopeInstanceId correctly", () => {
  mockDataSources.set(
    new Map([
      [
        "var1",
        {
          id: "var1",
          scopeInstanceId: undefined,
          name: "globalVariable",
          type: "variable",
        },
      ],
    ])
  );

  // Creating a variable with same name but undefined scope
  const error = validateDataVariableName("globalVariable");
  expect(error?.type).toBe("duplicate");
});
