import { describe, expect, test } from "vitest";
import * as protocol from "../index";
import {
  getPublicApiOperation,
  getPublicApiOperationPath,
  publicApiOperations,
} from "./operations";
import { publicApiOperationNamespaces } from "./runtime-contracts";
import { publicRuntimeOperationContracts } from "./runtime-contracts";

describe("public api operation catalog", () => {
  test("does not expose internal operation sources from the package entrypoint", () => {
    expect(protocol).not.toHaveProperty("localOnlyOperationInputs");
    expect(protocol).not.toHaveProperty("serverOnlyRouterOperationMetadata");
  });

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
      expect(Array.isArray(operation.inputFields)).toBe(true);
    }
  });

  test("documents public API input field names", () => {
    expect(getPublicApiOperation("create-page").inputFields).toEqual([
      "name",
      "path",
      "title",
      "parentFolderId",
      "meta",
    ]);
    expect(getPublicApiOperation("create-resource").inputFields).toEqual([
      "resource",
      "scopeInstanceId",
      "dataSourceName",
    ]);
    expect(getPublicApiOperation("create-domain").inputFields).toEqual([
      "domain",
    ]);
    expect(getPublicApiOperation("whoami").inputFields).toEqual([]);
  });

  test("documents array input field types consistently", () => {
    const operationsWithArrayInputs = publicApiOperations.filter(
      (operation) => Object.keys(operation.inputFieldTypes).length > 0
    );

    expect(operationsWithArrayInputs.length).toBeGreaterThan(0);
    for (const operation of operationsWithArrayInputs) {
      for (const [field, type] of Object.entries(operation.inputFieldTypes)) {
        expect(type).toBe("array");
        expect(operation.inputFields).toContain(field);
      }
    }
  });

  test("derives local-capable namespace metadata from runtime contracts", () => {
    const runtimeContractsById = new Map(
      publicRuntimeOperationContracts.map((contract) => [contract.id, contract])
    );
    const localCapableOperations: string[] = [];
    const serverOnlyOperations: string[] = [];

    for (const operation of publicApiOperations) {
      const contract =
        operation.runtimeOperationId === undefined
          ? undefined
          : runtimeContractsById.get(operation.runtimeOperationId);
      if (operation.localCapable) {
        localCapableOperations.push(operation.id);
      }
      if (operation.serverOnly) {
        serverOnlyOperations.push(operation.id);
      }

      expect(operation.localCapable).toBe(contract !== undefined);
      expect(operation.serverOnly).toBe(contract === undefined);
      expect(operation.runtimeOperationId).toBe(contract?.id);
      if (contract !== undefined) {
        expect(operation.inputFields).toEqual(contract.inputFields);
        expect(operation.requiredInputFields).toEqual(
          contract.requiredInputFields
        );
        expect(operation.inputFieldTypes).toEqual(contract.inputFieldTypes);
      }
      expect(operation.readNamespaces).toEqual(contract?.readNamespaces ?? []);
      expect(operation.writeNamespaces).toEqual(
        contract?.writeNamespaces ?? []
      );
      expect(operation.retryOnConflict).toBe(
        contract?.retryOnConflict ?? false
      );
      if (contract !== undefined) {
        expect(operation.invalidatesNamespaces).toEqual(
          contract.invalidatesNamespaces
        );
      }
    }

    expect(localCapableOperations.length).toBeGreaterThan(0);
    expect(serverOnlyOperations.length).toBeGreaterThan(0);
  });

  test("documents server-only namespace invalidation", () => {
    expect(getPublicApiOperation("apply-patch").serverOnly).toBe(true);
    expect(getPublicApiOperation("apply-patch").invalidatesNamespaces).toEqual(
      publicApiOperationNamespaces
    );
    expect(getPublicApiOperation("upload-asset").serverOnly).toBe(true);
    expect(getPublicApiOperation("upload-asset").invalidatesNamespaces).toEqual(
      ["assets"]
    );
    expect(getPublicApiOperation("upload-asset").requiredInputFields).toEqual([
      "asset",
    ]);
    expect(
      getPublicApiOperation("upload-assets").invalidatesNamespaces
    ).toEqual(["assets"]);
  });

  test("keeps operation lookup and tRPC path lookup strict", () => {
    expect(getPublicApiOperation("list-pages").id).toBe("pages.list");
    expect(getPublicApiOperationPath("list-pages")).toBe("api.pages.list");
    expect(() => getPublicApiOperationPath("upload-asset")).toThrow(
      'Public API operation "upload-asset" has no tRPC path.'
    );
  });
});
