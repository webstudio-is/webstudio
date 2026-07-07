import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runtimeOperationContracts } from "../contracts/builder-runtime";
import { builderRuntimeCutoverManifests } from "./cutover";

const runtimeRoot = join(import.meta.dirname, "..");

type RuntimeMutationTestCoverage = {
  testFiles: [string, ...string[]];
  covers: [string, ...string[]];
};

const runtimeMutationTestCoverageByFamily: Record<
  string,
  RuntimeMutationTestCoverage
> = {
  "page-create-update-mutations": {
    testFiles: ["runtime/pages.test.ts", "runtime/registry.test.ts"],
    covers: ["validation", "no-op", "generated ids", "patches"],
  },
  "page-delete-mutations": {
    testFiles: ["runtime/pages.test.ts"],
    covers: ["validation", "patches"],
  },
  "page-duplicate-mutations": {
    testFiles: ["runtime/page-copy.test.tsx"],
    covers: ["validation", "generated ids", "patches"],
  },
  "page-template-operations": {
    testFiles: ["runtime/page-copy.test.tsx"],
    covers: ["validation", "generated ids", "patches"],
  },
  "project-settings-operations": {
    testFiles: ["runtime/project-settings.test.ts"],
    covers: ["validation", "no-op", "patches"],
  },
  "redirect-operations": {
    testFiles: [
      "runtime/project-settings.test.ts",
      "runtime/redirect-validation.test.ts",
    ],
    covers: ["validation", "patches"],
  },
  "breakpoint-operations": {
    testFiles: ["runtime/project-settings.test.ts"],
    covers: ["validation", "patches"],
  },
  "folder-create-update-mutations": {
    testFiles: ["runtime/pages.test.ts", "runtime/page-copy.test.tsx"],
    covers: ["validation", "generated ids", "patches"],
  },
  "folder-delete-mutations": {
    testFiles: ["runtime/pages.test.ts"],
    covers: ["validation", "patches"],
  },
  "instance-structural-api-mutations": {
    testFiles: ["runtime/instances.test.ts"],
    covers: [
      "validation",
      "no-op",
      "generated ids",
      "patches",
      "content model",
    ],
  },
  "component-insert-mutations": {
    testFiles: [
      "runtime/components.test.ts",
      "runtime/component-template.test.ts",
      "runtime/component-templates.test.ts",
      "runtime/content-model.test.tsx",
      "runtime/insert-target.test.tsx",
    ],
    covers: ["validation", "generated ids", "patches", "content model"],
  },
  "text-content-mutations": {
    testFiles: ["runtime/instances.test.ts"],
    covers: [
      "validation",
      "no-op",
      "generated ids",
      "patches",
      "content model",
    ],
  },
  "prop-mutations": {
    testFiles: ["runtime/props.test.ts", "runtime/registry.test.ts"],
    covers: ["validation", "generated ids", "patches"],
  },
  "instance-metadata-mutations": {
    testFiles: ["runtime/instances.test.ts"],
    covers: ["validation", "no-op", "patches", "content model"],
  },
  "instance-layout-mutations": {
    testFiles: ["runtime/instances.test.ts"],
    covers: ["validation", "patches"],
  },
  "style-declaration-mutations": {
    testFiles: ["runtime/styles.test.ts"],
    covers: ["validation", "patches"],
  },
  "design-token-mutations": {
    testFiles: ["runtime/styles.test.ts"],
    covers: ["validation", "generated ids", "patches"],
  },
  "style-source-mutations": {
    testFiles: ["runtime/styles.test.ts"],
    covers: ["validation", "no-op", "generated ids", "patches"],
  },
  "css-variable-operations": {
    testFiles: ["runtime/styles.test.ts"],
    covers: ["validation", "patches"],
  },
  "resource-mutations": {
    testFiles: ["runtime/data.test.tsx"],
    covers: ["validation", "generated ids", "patches"],
  },
  "asset-reference-operations": {
    testFiles: ["runtime/assets.test.ts"],
    covers: ["validation", "no-op", "generated ids", "patches"],
  },
  "variable-mutations": {
    testFiles: ["runtime/data.test.tsx"],
    covers: ["validation", "no-op", "generated ids", "patches"],
  },
  "page-tree-and-clipboard-mutations": {
    testFiles: ["runtime/pages.test.ts", "runtime/page-copy.test.tsx"],
    covers: ["validation", "generated ids", "patches"],
  },
};

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

test("covers every cutover mutation family with direct runtime tests", () => {
  const mutationOperationIds = new Set<string>(
    runtimeOperationContracts
      .filter((contract) => contract.kind === "mutation")
      .map((contract) => contract.id)
  );
  const coveredMutationOperationIds = new Set<string>();
  const mutationFamilies = builderRuntimeCutoverManifests.filter((manifest) =>
    manifest.operationIds.some((operationId) =>
      mutationOperationIds.has(operationId)
    )
  );

  expect(Object.keys(runtimeMutationTestCoverageByFamily).sort()).toEqual(
    mutationFamilies.map((manifest) => manifest.family).sort()
  );

  for (const manifest of mutationFamilies) {
    const coverage = runtimeMutationTestCoverageByFamily[manifest.family];
    expect(coverage, manifest.family).toBeDefined();
    expect(coverage.covers, manifest.family).toEqual(
      expect.arrayContaining(["validation", "patches"])
    );

    for (const testFile of coverage.testFiles) {
      const path = join(runtimeRoot, testFile);
      expect(existsSync(path), testFile).toBe(true);
      expect(
        readFileSync(path, "utf8").trim().length,
        testFile
      ).toBeGreaterThan(0);
    }

    for (const operationId of manifest.operationIds) {
      if (mutationOperationIds.has(operationId)) {
        coveredMutationOperationIds.add(operationId);
      }
    }
  }

  expect(coveredMutationOperationIds).toEqual(mutationOperationIds);
});
