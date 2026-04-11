import { describe, test, expect } from "vitest";
import { type PlanFeatures, defaultPlanFeatures } from "./plan-features";
import { __testing__ } from "./plan-client.server";

const { parseProductMeta, mergeProductMetas } = __testing__;

/** Full-featured plan for use in tests — all booleans true, numeric limits at max */
const fullFeatures: PlanFeatures = {
  ...defaultPlanFeatures,
  canDownloadAssets: true,
  canRestoreBackups: true,
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmailsPerProject: 5,
  maxDomainsAllowedPerUser: 100,
  maxDailyPublishesPerUser: 100,
  maxWorkspaces: 1,
  maxProjectsAllowedPerUser: 100,
};

describe("parseProductMeta", () => {
  test("extracts known keys from a valid object", () => {
    const result = parseProductMeta({
      maxContactEmailsPerProject: 10,
      canDownloadAssets: true,
    });
    expect(result).toEqual({
      maxContactEmailsPerProject: 10,
      canDownloadAssets: true,
    });
  });

  test("strips unknown keys", () => {
    const result = parseProductMeta({
      admin: true,
      maxContactEmailsPerProject: 3,
    });
    expect(result).toEqual({ maxContactEmailsPerProject: 3 });
  });

  test("returns empty object for non-object input", () => {
    expect(parseProductMeta("not an object")).toEqual({});
    expect(parseProductMeta(42)).toEqual({});
    expect(parseProductMeta(undefined)).toEqual({});
  });

  test("returns empty object for null input", () => {
    expect(parseProductMeta(null)).toEqual({});
  });

  test("rejects negative numbers", () => {
    const result = parseProductMeta({ maxContactEmailsPerProject: -1 });
    expect(result).toEqual({});
  });

  test("accepts zero for numeric fields", () => {
    const result = parseProductMeta({ maxWorkspaces: 0 });
    expect(result).toEqual({ maxWorkspaces: 0 });
  });

  test("rejects wrong types for fields", () => {
    const result = parseProductMeta({
      canDownloadAssets: "yes",
      maxContactEmailsPerProject: "five",
    });
    expect(result).toEqual({});
  });
});

describe("mergeProductMetas", () => {
  test("booleans: true if ANY product grants the feature", () => {
    const result = mergeProductMetas([
      { ...fullFeatures, canDownloadAssets: false, canRestoreBackups: true },
      { ...fullFeatures, canDownloadAssets: true, canRestoreBackups: false },
    ]);
    expect(result.canDownloadAssets).toBe(true);
    expect(result.canRestoreBackups).toBe(true);
  });

  test("booleans: false when NO product grants the feature", () => {
    const result = mergeProductMetas([
      { ...fullFeatures, canDownloadAssets: false },
      { ...fullFeatures, canDownloadAssets: false },
    ]);
    expect(result.canDownloadAssets).toBe(false);
  });

  test("numbers: takes the highest value across products", () => {
    const result = mergeProductMetas([
      { ...fullFeatures, maxContactEmailsPerProject: 3, maxWorkspaces: 2 },
      { ...fullFeatures, maxContactEmailsPerProject: 10, maxWorkspaces: 5 },
    ]);
    expect(result.maxContactEmailsPerProject).toBe(10);
    expect(result.maxWorkspaces).toBe(5);
  });

  test("single product returns its values unchanged", () => {
    const plan = { ...fullFeatures, maxWorkspaces: 7 };
    const result = mergeProductMetas([plan]);
    expect(result).toEqual(plan);
  });

  test("empty array returns defaultPlanFeatures", () => {
    const result = mergeProductMetas([]);
    expect(result).toEqual(defaultPlanFeatures);
  });
});

describe("workspaces plan", () => {
  test("merging pro + workspaces product picks highest maxWorkspaces", () => {
    const proProduct = { ...fullFeatures, maxWorkspaces: 1 };
    const workspacesProduct = { ...defaultPlanFeatures, maxWorkspaces: 20 };

    const result = mergeProductMetas([proProduct, workspacesProduct]);
    expect(result.maxWorkspaces).toBe(20);
    expect(result.canDownloadAssets).toBe(true);
  });
});
