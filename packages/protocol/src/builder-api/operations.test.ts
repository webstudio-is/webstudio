import { describe, expect, test } from "vitest";
import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts";
import {
  getPublicApiOperation,
  getPublicApiOperationPath,
  publicApiOperations,
} from "./operations";
import { publicRuntimeOperationContracts } from "./runtime-contracts";

describe("public api operation catalog", () => {
  test("has stable unique command and operation ids", () => {
    const commands = publicApiOperations.map((operation) => operation.command);
    const ids = publicApiOperations.map((operation) => operation.id);

    expect(new Set(commands).size).toBe(commands.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("owns documentation metadata for every command", () => {
    for (const operation of publicApiOperations) {
      expect(operation.description).not.toBe("");
      expect(operation.examples.length).toBeGreaterThan(0);
    }
  });

  test("derives local-capable namespace metadata from runtime contracts", () => {
    const runtimeContractsById = new Map(
      publicRuntimeOperationContracts.map((contract) => [contract.id, contract])
    );
    const localCapableOperations: string[] = [];
    const serverOnlyOperations: string[] = [];

    for (const operation of publicApiOperations) {
      const contract = runtimeContractsById.get(operation.id);
      if (operation.localCapable) {
        localCapableOperations.push(operation.id);
      }
      if (operation.serverOnly) {
        serverOnlyOperations.push(operation.id);
      }

      expect(operation.localCapable).toBe(contract !== undefined);
      expect(operation.serverOnly).toBe(contract === undefined);
      expect(operation.runtimeOperationId).toBe(contract?.id);
      expect(operation.readNamespaces).toEqual(contract?.readNamespaces ?? []);
      expect(operation.writeNamespaces).toEqual(
        contract?.writeNamespaces ?? []
      );
      expect(operation.invalidatesNamespaces).toEqual(
        contract?.invalidatesNamespaces ?? []
      );
    }

    expect(localCapableOperations.length).toBeGreaterThan(0);
    expect(serverOnlyOperations.length).toBeGreaterThan(0);
  });

  test("keeps protocol runtime metadata in sync with project-build contracts", () => {
    const normalize = (
      contracts: readonly {
        id: string;
        readNamespaces: readonly string[];
        writeNamespaces: readonly string[];
        invalidatesNamespaces: readonly string[];
      }[]
    ) =>
      contracts.map(
        ({ id, readNamespaces, writeNamespaces, invalidatesNamespaces }) => ({
          id,
          readNamespaces,
          writeNamespaces,
          invalidatesNamespaces,
        })
      );

    expect(normalize(publicRuntimeOperationContracts)).toEqual(
      normalize(runtimeOperationContracts)
    );
  });

  test("keeps operation lookup and tRPC path lookup strict", () => {
    expect(getPublicApiOperation("list-pages").id).toBe("pages.list");
    expect(getPublicApiOperationPath("list-pages")).toBe("api.pages.list");
    expect(() => getPublicApiOperationPath("upload-asset")).toThrow(
      'Public API operation "upload-asset" has no tRPC path.'
    );
  });
});
