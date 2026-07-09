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
    runtimeOperationContracts.map(
      ({
        id,
        command,
        client,
        permit,
        kind,
        inputSchema,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
        retryOnConflict,
        requiresAssets,
        requiresConfirm,
      }) => ({
        id,
        command,
        client,
        permit,
        kind,
        inputSchema,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
        retryOnConflict,
        requiresAssets,
        requiresConfirm,
      })
    )
  );
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
