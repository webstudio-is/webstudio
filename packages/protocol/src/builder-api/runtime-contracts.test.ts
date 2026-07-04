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
        inputFields,
        requiredInputFields,
        inputFieldTypes,
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
        inputFields,
        requiredInputFields,
        inputFieldTypes,
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

test("keeps public protocol types independent from project-build", async () => {
  for (const file of ["operations.ts", "runtime-contracts.ts"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf-8");
    expect(source).not.toMatch(
      /import\s+type\s+[^;]+from\s+["']@webstudio-is\/project-build/
    );
  }

  const packageJson = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf-8")
  );
  expect(packageJson.private).toBe(false);
  expect(packageJson.dependencies).not.toHaveProperty(
    "@webstudio-is/project-build"
  );
});
