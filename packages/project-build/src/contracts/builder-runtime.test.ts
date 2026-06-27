import { describe, expect, test } from "vitest";
import {
  runtimeOperationContracts,
  type RuntimeOperationId,
} from "./builder-runtime";

const knownOperationId: RuntimeOperationId = "pages.list";
void knownOperationId;
// @ts-expect-error RuntimeOperationId must stay narrowed to the catalog union.
const unknownOperationId: RuntimeOperationId = "unknown.operation";
void unknownOperationId;

describe("builder runtime operation contracts", () => {
  test("has unique operation ids", () => {
    const ids = runtimeOperationContracts.map((contract) => contract.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("describes reads and mutations with namespace metadata", () => {
    for (const contract of runtimeOperationContracts) {
      expect(contract.readNamespaces).toBeDefined();
      expect(contract.writeNamespaces).toBeDefined();
      expect(contract.invalidatesNamespaces).toBeDefined();

      if (contract.kind === "read") {
        expect(contract.writeNamespaces).toEqual([]);
        expect(contract.invalidatesNamespaces).toEqual([]);
      }

      if (contract.kind === "mutation") {
        expect(
          contract.writeNamespaces.length +
            contract.invalidatesNamespaces.length
        ).toBeGreaterThan(0);
      }
    }
  });

  test("includes page list contract", () => {
    expect(
      runtimeOperationContracts.find((contract) => contract.id === "pages.list")
        ?.readNamespaces
    ).toEqual(["pages"]);
  });
});
