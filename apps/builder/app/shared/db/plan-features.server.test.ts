import { describe, test, expect } from "vitest";
import {
  type PlanFeatures,
  defaultPlanFeatures,
} from "@webstudio-is/trpc-interface/plan-features";
import { __testing__ } from "./plan-features.server";

const { parseProductMeta, mergeProductMetas, parsePlansEnv } = __testing__;

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
  maxSeatsPerWorkspace: 20,
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
      {
        ...fullFeatures,
        canDownloadAssets: false,
        canRestoreBackups: true,
      },
      {
        ...fullFeatures,
        canDownloadAssets: true,
        canRestoreBackups: false,
      },
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
    // Pro product grants all features with maxWorkspaces: 1
    const proProduct = { ...fullFeatures, maxWorkspaces: 1 };
    // Workspaces add-on only grants extra workspaces; all other fields default to false/0
    const workspacesProduct = { ...defaultPlanFeatures, maxWorkspaces: 20 };

    const result = mergeProductMetas([proProduct, workspacesProduct]);
    expect(result.maxWorkspaces).toBe(20);
    expect(result.canDownloadAssets).toBe(true);
  });
});

describe("parsePlansEnv", () => {
  const validEntry = JSON.stringify({ name: "Pro", features: fullFeatures });
  const twoEntries = JSON.stringify([
    { name: "Pro", features: fullFeatures },
    { name: "Workspaces", features: { ...fullFeatures, maxWorkspaces: 10 } },
  ]);

  test("returns empty map for empty JSON array", () => {
    expect(parsePlansEnv("[]").size).toBe(0);
  });

  test("returns empty map for invalid JSON", () => {
    expect(parsePlansEnv("not json").size).toBe(0);
  });

  test("returns empty map for non-array JSON", () => {
    expect(parsePlansEnv(validEntry).size).toBe(0);
  });

  test("skips entries missing features key", () => {
    expect(parsePlansEnv(JSON.stringify([{ name: "Pro" }])).size).toBe(0);
  });

  test("extends: child inherits parent features and overrides specific fields", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Pro", features: fullFeatures },
        { name: "Team", extends: "Pro", features: { maxWorkspaces: 50 } },
      ])
    );
    expect(result.size).toBe(2);
    // Team inherits all of Pro's features
    expect(result.get("Team")!.canDownloadAssets).toBe(true);
    // but overrides maxWorkspaces
    expect(result.get("Team")!.maxWorkspaces).toBe(50);
    // Pro itself is unchanged
    expect(result.get("Pro")!.maxWorkspaces).toBe(fullFeatures.maxWorkspaces);
  });

  test("extends: throws when extending an unknown plan", () => {
    expect(() =>
      parsePlansEnv(
        JSON.stringify([
          {
            name: "Team",
            extends: "NonExistent",
            features: { maxWorkspaces: 5 },
          },
        ])
      )
    ).toThrow('PLANS entry "Team" extends unknown plan "NonExistent"');
  });

  test("parses a single valid entry", () => {
    const result = parsePlansEnv(`[${validEntry}]`);
    expect(result.size).toBe(1);
    expect(result.get("Pro")).toEqual(fullFeatures);
  });

  test("parses multiple valid entries", () => {
    const result = parsePlansEnv(twoEntries);
    expect(result.size).toBe(2);
    expect(result.get("Workspaces")!.maxWorkspaces).toBe(10);
  });

  test("skips entries with invalid features (wrong type), keeps valid ones", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Bad", features: { canDownloadAssets: "not-a-bool" } },
        { name: "Pro", features: fullFeatures },
      ])
    );
    expect(result.size).toBe(1);
    expect(result.get("Pro")).toEqual(fullFeatures);
  });

  test("partial features without extends fills in from defaultPlanFeatures", () => {
    const result = parsePlansEnv(
      JSON.stringify([{ name: "Pro", features: { canDownloadAssets: true } }])
    );
    expect(result.size).toBe(1);
    expect(result.get("Pro")).toEqual({
      ...defaultPlanFeatures,
      canDownloadAssets: true,
    });
  });

  test("strips unknown keys from features", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Pro", features: { ...fullFeatures, admin: true } },
      ])
    );
    expect(result.size).toBe(1);
    expect(
      (result.get("Pro") as Record<string, unknown>)["admin"]
    ).toBeUndefined();
  });
});
