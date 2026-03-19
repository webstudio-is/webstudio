import { describe, test, expect } from "vitest";
import { __testing__ } from "./user-plan-features.server";

const { parseProductMeta, proPlanDefaults, mergeProductMetas } = __testing__;

describe("parseProductMeta", () => {
  test("extracts known keys from a valid object", () => {
    const result = parseProductMeta({
      maxContactEmails: 10,
      canDownloadAssets: true,
    });
    expect(result).toEqual({
      maxContactEmails: 10,
      canDownloadAssets: true,
    });
  });

  test("strips unknown keys", () => {
    const result = parseProductMeta({
      admin: true,
      maxContactEmails: 3,
    });
    expect(result).toEqual({ maxContactEmails: 3 });
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
    const result = parseProductMeta({ maxContactEmails: -1 });
    expect(result).toEqual({});
  });

  test("accepts zero for numeric fields", () => {
    const result = parseProductMeta({ maxWorkspaces: 0 });
    expect(result).toEqual({ maxWorkspaces: 0 });
  });

  test("rejects wrong types for fields", () => {
    const result = parseProductMeta({
      canDownloadAssets: "yes",
      maxContactEmails: "five",
    });
    expect(result).toEqual({});
  });
});

describe("proPlanDefaults", () => {
  test("returns plan with all boolean features enabled", () => {
    const plan = proPlanDefaults(5);
    expect(plan.canDownloadAssets).toBe(true);
    expect(plan.canRestoreBackups).toBe(true);
    expect(plan.allowAdditionalPermissions).toBe(true);
    expect(plan.allowDynamicData).toBe(true);
    expect(plan.allowContentMode).toBe(true);
    expect(plan.allowStagingPublish).toBe(true);
  });

  test("uses provided maxWorkspaces value", () => {
    expect(proPlanDefaults(3).maxWorkspaces).toBe(3);
    expect(proPlanDefaults(10).maxWorkspaces).toBe(10);
  });

  test("sets high numeric limits", () => {
    const plan = proPlanDefaults(1);
    expect(plan.maxDomainsAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
    expect(plan.maxPublishesAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
    expect(plan.maxProjectsAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
    expect(plan.maxContactEmails).toBe(5);
  });
});

describe("mergeProductMetas", () => {
  test("booleans: true if ANY product grants the feature", () => {
    const result = mergeProductMetas([
      {
        ...proPlanDefaults(1),
        canDownloadAssets: false,
        canRestoreBackups: true,
      },
      {
        ...proPlanDefaults(1),
        canDownloadAssets: true,
        canRestoreBackups: false,
      },
    ]);
    expect(result.canDownloadAssets).toBe(true);
    expect(result.canRestoreBackups).toBe(true);
  });

  test("booleans: false when NO product grants the feature", () => {
    const result = mergeProductMetas([
      { ...proPlanDefaults(1), canDownloadAssets: false },
      { ...proPlanDefaults(1), canDownloadAssets: false },
    ]);
    expect(result.canDownloadAssets).toBe(false);
  });

  test("numbers: takes the highest value across products", () => {
    const result = mergeProductMetas([
      { ...proPlanDefaults(1), maxContactEmails: 3, maxWorkspaces: 2 },
      { ...proPlanDefaults(1), maxContactEmails: 10, maxWorkspaces: 5 },
    ]);
    expect(result.maxContactEmails).toBe(10);
    expect(result.maxWorkspaces).toBe(5);
  });

  test("single product returns its values unchanged", () => {
    const plan = proPlanDefaults(7);
    const result = mergeProductMetas([plan]);
    expect(result).toEqual(plan);
  });

  test("empty array returns proPlanDefaults", () => {
    const result = mergeProductMetas([]);
    const defaults = proPlanDefaults(1);
    // All boolean features should be true (pro defaults)
    expect(result.canDownloadAssets).toBe(defaults.canDownloadAssets);
    expect(result.canRestoreBackups).toBe(defaults.canRestoreBackups);
    // Numeric limits should NOT be -Infinity
    expect(result.maxContactEmails).toBeGreaterThanOrEqual(0);
    expect(result.maxWorkspaces).toBeGreaterThanOrEqual(1);
  });
});

describe("workspaces plan", () => {
  test("workspaces plan extends pro defaults with maxWorkspaces: 20", () => {
    // A product called "workspaces" stored in Product.meta would look like:
    const workspacesMeta = parseProductMeta({ maxWorkspaces: 20 });
    const defaults = proPlanDefaults(1);
    const plan = { ...defaults, ...workspacesMeta };

    // All pro features remain enabled
    expect(plan.canDownloadAssets).toBe(true);
    expect(plan.canRestoreBackups).toBe(true);
    expect(plan.allowAdditionalPermissions).toBe(true);
    expect(plan.allowDynamicData).toBe(true);
    expect(plan.allowContentMode).toBe(true);
    expect(plan.allowStagingPublish).toBe(true);

    // Workspace limit is overridden
    expect(plan.maxWorkspaces).toBe(20);

    // Other numeric limits remain at pro defaults
    expect(plan.maxDomainsAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
    expect(plan.maxPublishesAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
    expect(plan.maxProjectsAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
  });

  test("merging pro + workspaces product picks highest maxWorkspaces", () => {
    const defaults = proPlanDefaults(1);
    const proProduct: typeof defaults = { ...defaults, maxWorkspaces: 1 };
    const workspacesProduct: typeof defaults = {
      ...defaults,
      maxWorkspaces: 20,
    };

    const result = mergeProductMetas([proProduct, workspacesProduct]);
    expect(result.maxWorkspaces).toBe(20);
    expect(result.canDownloadAssets).toBe(true);
  });

  test("single workspaces product provides all pro features", () => {
    const defaults = proPlanDefaults(20);
    const workspacesProduct: typeof defaults = {
      ...defaults,
      maxWorkspaces: 20,
    };

    const result = mergeProductMetas([workspacesProduct]);
    expect(result.maxWorkspaces).toBe(20);
    expect(result.canDownloadAssets).toBe(true);
    expect(result.canRestoreBackups).toBe(true);
    expect(result.allowDynamicData).toBe(true);
    expect(result.maxDomainsAllowedPerUser).toBe(Number.MAX_SAFE_INTEGER);
  });
});
