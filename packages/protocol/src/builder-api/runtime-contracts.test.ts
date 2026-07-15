import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts";
import { builderApiCapabilities } from "@webstudio-is/project-build/contracts";
import { builderNamespaces } from "@webstudio-is/project-build/contracts";
import {
  publicApiOperationNamespaces,
  publicApiOperationPermits,
  publicRuntimeOperationContracts,
} from "./runtime-contracts";

test("exposes public runtime contracts without private metadata", () => {
  expect(publicRuntimeOperationContracts).toEqual(
    runtimeOperationContracts.map((contract) => ({
      id: contract.id,
      command: contract.command,
      client: contract.client,
      permit: contract.permit,
      kind: contract.kind,
      inputSchema: contract.inputSchema,
      outputSchema: contract.outputSchema,
      readNamespaces: contract.readNamespaces,
      writeNamespaces: contract.writeNamespaces,
      invalidatesNamespaces: contract.invalidatesNamespaces,
      retryOnConflict: contract.retryOnConflict,
      requiresAssets: contract.requiresAssets,
      requiresConfirm: contract.requiresConfirm,
    }))
  );
});

test("exposes the audit output schema and stable rule ids", () => {
  const audit = publicRuntimeOperationContracts.find(
    (contract) => contract.id === "project.audit"
  );
  expect(audit?.outputSchema).toBeDefined();
  const outputSchema = JSON.stringify(audit?.outputSchema);
  expect(outputSchema).toContain('"missing-aria-reference"');
  expect(outputSchema).toContain('"contractVersion"');
  expect(outputSchema).toContain('"const":1');
});

test("exposes complete output schemas for every public runtime operation", () => {
  expect(
    publicRuntimeOperationContracts
      .filter((contract) => contract.outputSchema === undefined)
      .map((contract) => contract.id)
  ).toEqual([]);

  const byId = new Map(
    publicRuntimeOperationContracts.map((contract) => [contract.id, contract])
  );
  expect(byId.get("pages.list")?.outputSchema.properties?.pages).toBeDefined();
  expect(
    byId.get("instances.inspect")?.outputSchema.properties?.ancestors
  ).toBeDefined();
  expect(
    byId.get("instances.inspect")?.outputSchema.properties?.props
  ).toMatchObject({ type: "array" });
  expect(
    byId.get("instances.inspect")?.outputSchema.properties?.children
  ).toMatchObject({ type: "array" });
  expect(byId.get("assets.update")?.outputSchema).toMatchObject({
    required: ["assetId"],
  });
  expect(byId.get("resources.update")?.outputSchema).toMatchObject({
    properties: {
      resourceId: { type: "string" },
      dataSourceId: { type: "string" },
      warnings: { type: "array" },
    },
    required: ["resourceId"],
  });
  expect(byId.get("instances.deleteBySelector")?.outputSchema).toMatchObject({
    properties: {
      instanceIds: { type: "array" },
      instanceSelector: { type: "array" },
    },
    required: ["instanceIds"],
  });
  expect(byId.get("projectSettings.get")?.outputSchema).toMatchObject({
    properties: {
      meta: { properties: { siteName: { type: "string" } } },
      compiler: { properties: { atomicStyles: { type: "boolean" } } },
      redirects: { type: "array" },
    },
  });
});

test("exposes public operation namespaces from builder namespaces", () => {
  expect(publicApiOperationNamespaces).toBe(builderNamespaces);
});

test("exposes public operation permits from builder api capabilities", () => {
  expect(publicApiOperationPermits).toBe(builderApiCapabilities);
});

test("keeps public protocol package independent from project-build at runtime", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf-8")
  );
  expect(packageJson.private).toBe(false);
  expect(packageJson.dependencies).not.toHaveProperty(
    "@webstudio-is/project-build"
  );
});
