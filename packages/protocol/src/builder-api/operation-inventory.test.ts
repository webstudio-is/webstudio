import { describe, expect, test } from "vitest";
import {
  inventoriedOperationIds,
  operationFamilyInventory,
} from "./operation-inventory";
import { publicApiOperations } from "./operations";

describe("public api operation-family inventory", () => {
  test("accounts for every public operation exactly once", () => {
    const publicOperationIds = publicApiOperations.map(
      (operation) => operation.id
    );
    const inventoryOperationIds = operationFamilyInventory.flatMap(
      (family) => family.operationIds
    );

    expect(new Set(inventoryOperationIds).size).toBe(
      inventoryOperationIds.length
    );
    expect([...inventoriedOperationIds].sort()).toEqual(
      [...publicOperationIds].sort()
    );
  });

  test("documents current entry points and expected shared owner", () => {
    for (const family of operationFamilyInventory) {
      expect(family.operationIds.length).toBeGreaterThan(0);
      expect(family.currentEntryPoints.length).toBeGreaterThan(0);
      expect(family.currentTests.length).toBeGreaterThan(0);
      expect(family.expectedSharedOwner).not.toBe("");
    }
  });
});
