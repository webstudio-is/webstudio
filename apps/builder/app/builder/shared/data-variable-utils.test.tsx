import { expect, test } from "vitest";
import { atom } from "nanostores";
import { $dataSources } from "~/shared/sync/data-stores";
import { validateDataVariableName } from "./data-variable-utils";
import type { DataSources, DataSource } from "@webstudio-is/sdk";

// Mock the nano-states module
const mockDataSources = atom<DataSources>(new Map());

// Replace the actual store with our mock
Object.defineProperty($dataSources, "get", {
  value: () => mockDataSources.get(),
});

// Helper to create a minimal variable data source for testing
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
    new Map([["var1", createVariable("var1", "existingVariable", "instance1")]])
  );

  const error = validateDataVariableName("newVariable");
  expect(error).toBeUndefined();
});

test("validateDataVariableName returns duplicate error when name exists on same instance", () => {
  mockDataSources.set(
    new Map([
      ["var1", createVariable("var1", "myVariable", "instance1")],
      ["var2", createVariable("var2", "otherVariable", "instance1")],
    ])
  );

  // Creating a new variable with existing name on same instance
  const error = validateDataVariableName("myVariable", "var2");
  expect(error?.type).toBe("duplicate");
});

test("validateDataVariableName allows same name on different instances", () => {
  mockDataSources.set(
    new Map([
      ["var1", createVariable("var1", "myVariable", "instance1")],
      ["var2", createVariable("var2", "otherVariable", "instance2")],
    ])
  );

  // Creating a variable on instance2 with name that exists on instance1
  const error = validateDataVariableName("myVariable", "var2");
  expect(error).toBeUndefined();
});

test("validateDataVariableName allows renaming variable to same name", () => {
  mockDataSources.set(
    new Map([["var1", createVariable("var1", "myVariable", "instance1")]])
  );

  // Renaming var1 to its current name
  const error = validateDataVariableName("myVariable", "var1");
  expect(error).toBeUndefined();
});

test("validateDataVariableName returns duplicate error when renaming to existing name on same instance", () => {
  mockDataSources.set(
    new Map([
      ["var1", createVariable("var1", "firstVariable", "instance1")],
      ["var2", createVariable("var2", "secondVariable", "instance1")],
    ])
  );

  // Renaming var2 to var1's name on same instance
  const error = validateDataVariableName("firstVariable", "var2");
  expect(error?.type).toBe("duplicate");
});

test("validateDataVariableName ignores non-variable data sources", () => {
  mockDataSources.set(
    new Map([
      ["var1", createVariable("var1", "myVariable", "instance1")],
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
    new Map([["var1", createVariable("var1", "existingVariable", "instance1")]])
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
    new Map([["var1", createVariable("var1", "globalVariable", undefined)]])
  );

  // Creating a variable with same name but undefined scope
  const error = validateDataVariableName("globalVariable");
  expect(error?.type).toBe("duplicate");
});
