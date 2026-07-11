import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { builderApiCapabilities } from "@webstudio-is/project-build/contracts/permissions";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
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
      ...("outputSchema" in contract
        ? { outputSchema: contract.outputSchema }
        : {}),
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
