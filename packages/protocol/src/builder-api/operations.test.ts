import { describe, expect, test } from "vitest";
import {
  getPublicApiOperation,
  getPublicApiOperationPath,
  publicApiOperations,
} from "./operations";
import { publicApiOperationNamespaces } from "./runtime-contracts";
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
      expect(Array.isArray(operation.inputFields)).toBe(true);
    }
  });

  test("documents public API input field names", () => {
    expect(getPublicApiOperation("create-page").inputFields).toEqual([
      "pageId",
      "name",
      "path",
      "title",
      "parentFolderId",
      "meta",
    ]);
    expect(getPublicApiOperation("create-resource").inputFields).toEqual([
      "resourceId",
      "resource",
      "dataSourceId",
      "scopeInstanceId",
      "dataSourceName",
    ]);
    expect(getPublicApiOperation("create-domain").inputFields).toEqual([
      "domain",
    ]);
    expect(getPublicApiOperation("whoami").inputFields).toEqual([]);
  });

  test("documents array input field types", () => {
    const expectedArrayInputFieldTypes = {
      "append-instance": { children: "array" },
      "move-instance": { moves: "array" },
      "delete-instance": { instanceIds: "array" },
      "update-props": { updates: "array" },
      "delete-props": { deletions: "array" },
      "bind-props": { bindings: "array" },
      "update-styles": { updates: "array" },
      "delete-styles": { deletions: "array" },
      "create-design-token": { tokens: "array" },
      "update-design-token-styles": { updates: "array" },
      "delete-design-token-styles": { deletions: "array" },
      "attach-design-token": { instanceIds: "array" },
      "detach-design-token": { instanceIds: "array" },
      "extract-design-token": {
        instanceIds: "array",
        removeLocalProps: "array",
      },
      "delete-css-variable": { names: "array" },
      "delete-asset": { assetIdsOrPrefixes: "array" },
    } as const;

    const expectedEntries = Object.entries(
      expectedArrayInputFieldTypes
    ) as Array<
      [
        keyof typeof expectedArrayInputFieldTypes,
        (typeof expectedArrayInputFieldTypes)[keyof typeof expectedArrayInputFieldTypes],
      ]
    >;

    for (const [command, inputFieldTypes] of expectedEntries) {
      expect(getPublicApiOperation(command).inputFieldTypes).toEqual(
        inputFieldTypes
      );
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
    expect(getPublicApiOperation("apply-patch").invalidatesNamespaces).toBe(
      publicApiOperationNamespaces
    );
    expect(getPublicApiOperation("upload-asset").serverOnly).toBe(true);
    expect(getPublicApiOperation("upload-asset").invalidatesNamespaces).toEqual(
      ["assets"]
    );
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
