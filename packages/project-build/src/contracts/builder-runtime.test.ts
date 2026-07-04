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
  const getContract = (id: RuntimeOperationId) => {
    const contract = runtimeOperationContracts.find(
      (contract) => contract.id === id
    );
    if (contract === undefined) {
      throw Error(`Expected ${id} contract`);
    }
    return contract;
  };

  test("has unique operation ids", () => {
    const ids = runtimeOperationContracts.map((contract) => contract.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("has unique public api commands and clients", () => {
    const commands = runtimeOperationContracts.map(
      (contract) => contract.command
    );
    const clients = runtimeOperationContracts.map(
      (contract) => contract.client
    );

    expect(new Set(commands).size).toBe(commands.length);
    expect(new Set(clients).size).toBe(clients.length);
  });

  test("marks content-mode operations with edit permit", () => {
    expect(getContract("instances.updateProps").permit).toBe("edit");
    expect(getContract("instances.deleteProps").permit).toBe("edit");
    expect(getContract("instances.updateText").permit).toBe("edit");
  });

  test("describes reads and mutations with namespace metadata", () => {
    for (const contract of runtimeOperationContracts) {
      expect(contract.readNamespaces).toBeDefined();
      expect(contract.writeNamespaces).toBeDefined();
      expect(contract.invalidatesNamespaces).toBeDefined();
      for (const field of contract.requiredInputFields) {
        expect(contract.inputFields).toContain(field);
      }

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

  test("derives required public input fields without generated ids", () => {
    expect(getContract("pages.create").requiredInputFields).toEqual([
      "name",
      "path",
    ]);
    expect(getContract("folders.create").requiredInputFields).toEqual([
      "name",
      "slug",
    ]);
    expect(getContract("pages.create").requiredInputFields).not.toContain(
      "pageId"
    );
  });

  test("loads full tree namespaces for mutations that can remove referenced records", () => {
    const namespaces = [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "styles",
      "styleSources",
      "styleSourceSelections",
    ];

    for (const id of [
      "pages.delete",
      "folders.delete",
      "instances.append",
      "instances.clone",
      "instances.delete",
    ] as const) {
      const contract = getContract(id);
      expect(contract.readNamespaces).toEqual(
        expect.arrayContaining(namespaces)
      );
      expect(contract.writeNamespaces).toEqual(
        expect.arrayContaining(namespaces)
      );
    }
  });

  test("loads full page-copy namespaces for page duplication", () => {
    const namespaces = [
      "pages",
      "assets",
      "dataSources",
      "resources",
      "instances",
      "props",
      "breakpoints",
      "styles",
      "styleSources",
      "styleSourceSelections",
    ];
    const contract = getContract("pages.duplicate");

    expect(contract.readNamespaces).toEqual(expect.arrayContaining(namespaces));
    expect(contract.writeNamespaces).toEqual(
      expect.arrayContaining(namespaces)
    );
  });
});
