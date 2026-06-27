import { expect, test } from "vitest";
import { runtimeOperationContracts } from "../contracts/builder-runtime";
import { builderRuntimeCutoverManifests } from "./cutover";

test("documents cutover families with known runtime operation ids", () => {
  const operationIds = new Set(
    runtimeOperationContracts.map((contract) => contract.id)
  );
  const cutoverOperationIds = new Set<string>();
  const familyNames = builderRuntimeCutoverManifests.map(
    (manifest) => manifest.family
  );

  expect(new Set(familyNames).size).toBe(familyNames.length);
  for (const manifest of builderRuntimeCutoverManifests) {
    expect(manifest.operationIds.length).toBeGreaterThan(0);
    expect(manifest.callers.length).toBeGreaterThan(0);
    for (const operationId of manifest.operationIds) {
      expect(operationIds.has(operationId)).toBe(true);
      cutoverOperationIds.add(operationId);
    }
  }
  expect(cutoverOperationIds).toEqual(operationIds);
});
