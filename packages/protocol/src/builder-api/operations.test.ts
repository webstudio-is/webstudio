import { describe, expect, test } from "vitest";
import { getInputJsonSchemaMetadata } from "@webstudio-is/sdk";
import * as protocol from "../index";
import {
  getPublicApiOperation,
  getPublicApiOperationPath,
  publicApiOperations,
} from "./operations";
import { serverOnlyRouterOperationMetadata } from "./__generated__/server-only-router-operation-metadata";
import { localOnlyOperationInputs } from "./local-operation-inputs";
import { publicApiOperationDocumentation } from "./operation-docs";
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

  test("keeps documentation in sync with implemented commands", () => {
    const implementedCommands = [
      ...publicRuntimeOperationContracts.map((operation) => operation.command),
      ...Object.values(serverOnlyRouterOperationMetadata).map(
        (operation) => operation.command
      ),
      ...localOnlyOperationInputs.map((operation) => operation.command),
    ].sort();
    const documentedCommands = publicApiOperationDocumentation
      .map((operation) => operation.command)
      .sort();

    expect(documentedCommands).toEqual(implementedCommands);
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
      "exposeAsDataSource",
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

  test("documents rich MCP input schemas for structured editing operations", () => {
    const pageUpdateValuesSchema =
      getPublicApiOperation("update-page").inputSchema?.properties?.values;
    expect(pageUpdateValuesSchema).toEqual(expect.any(Object));
    if (
      pageUpdateValuesSchema === undefined ||
      typeof pageUpdateValuesSchema !== "object"
    ) {
      throw Error("Expected update-page values schema object");
    }
    expect(pageUpdateValuesSchema.type).toBe("object");
    expect(pageUpdateValuesSchema.properties?.title).toMatchObject({
      type: "string",
    });
    expect(pageUpdateValuesSchema.properties?.meta).toMatchObject({
      type: "object",
    });
    expect(
      getPublicApiOperation("move-instance").inputSchema?.properties?.moves
    ).toMatchObject({
      type: "array",
      items: expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          instanceId: { type: "string" },
          parentInstanceId: { type: "string" },
        }),
      }),
    });
    expect(
      getPublicApiOperation("update-props").inputSchema?.properties?.updates
    ).toMatchObject({
      type: "array",
      items: expect.objectContaining({
        oneOf: expect.arrayContaining([
          expect.objectContaining({
            type: "object",
            properties: expect.objectContaining({
              instanceId: expect.objectContaining({ type: "string" }),
              name: expect.objectContaining({ type: "string" }),
              type: expect.objectContaining({ const: "string" }),
              value: expect.objectContaining({ type: "string" }),
            }),
            required: expect.arrayContaining([
              "instanceId",
              "name",
              "type",
              "value",
            ]),
          }),
        ]),
      }),
    });
    expect(
      getPublicApiOperation("update-text").inputSchema?.properties?.mode
    ).toMatchObject({
      type: "string",
      enum: ["text", "expression"],
      description: expect.stringContaining('There is no "replace" mode.'),
    });
    const resourceInputSchema =
      getPublicApiOperation("create-resource").inputSchema?.properties
        ?.resource;
    expect(resourceInputSchema).toEqual(
      expect.objectContaining({ type: "object" })
    );
    if (
      resourceInputSchema === undefined ||
      typeof resourceInputSchema !== "object"
    ) {
      throw Error("Expected create-resource input schema object");
    }
    const headerValueSchema = (
      resourceInputSchema.properties?.headers as
        | { items?: { properties?: { value?: unknown } } }
        | undefined
    )?.items?.properties?.value;
    expect(headerValueSchema).toMatchObject({
      anyOf: [
        { type: "string" },
        {
          type: "object",
          properties: {
            type: { const: "literal" },
            value: { type: "string" },
          },
        },
      ],
    });
    expect(
      getPublicApiOperation("update-styles").inputSchema?.properties?.updates
    ).toMatchObject({
      type: "array",
      items: expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          instanceId: { type: "string" },
          property: { type: "string" },
        }),
      }),
    });
    expect(
      getPublicApiOperation("apply-patch").inputSchema?.properties?.transactions
    ).toMatchObject({
      type: "array",
      items: expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          id: expect.objectContaining({ type: "string" }),
          payload: expect.objectContaining({ type: "array" }),
        }),
      }),
    });
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
        const inputSchemaMetadata = getInputJsonSchemaMetadata(
          contract.inputSchema
        );
        expect(operation.inputFields).toEqual(inputSchemaMetadata.inputFields);
        expect(operation.requiredInputFields).toEqual(
          inputSchemaMetadata.requiredInputFields
        );
        expect(operation.inputFieldTypes).toEqual(
          inputSchemaMetadata.inputFieldTypes
        );
        expect(operation.inputSchema).toEqual(contract.inputSchema);
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

  test("classifies every public mutation by architectural owner", () => {
    const mutations = publicApiOperations.filter(
      (operation) => operation.method === "mutation"
    );

    expect(
      mutations.every((operation) => operation.semanticOwner !== undefined)
    ).toBe(true);
    expect(getPublicApiOperation("apply-patch").semanticOwner).toBe(
      "raw-build-patch"
    );
    expect(getPublicApiOperation("upload-asset").semanticOwner).toBe(
      "local-side-effect"
    );
    expect(getPublicApiOperation("publish").semanticOwner).toBe(
      "server-infrastructure"
    );
    expect(getPublicApiOperation("create-page").semanticOwner).toBe("runtime");
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

  test("allows MCP uploads to target asset folders", () => {
    const upload = getPublicApiOperation("upload-asset");
    const uploadMany = getPublicApiOperation("upload-assets");

    expect(JSON.stringify(upload.inputSchema)).toContain('"folderId"');
    expect(JSON.stringify(uploadMany.inputSchema)).toContain('"folderId"');
  });

  test("keeps operation lookup and tRPC path lookup strict", () => {
    expect(getPublicApiOperation("list-pages").id).toBe("pages.list");
    expect(getPublicApiOperationPath("list-pages")).toBe("api.pages.list");
    expect(() => getPublicApiOperationPath("upload-asset")).toThrow(
      'Public API operation "upload-asset" has no tRPC path.'
    );
  });
});
