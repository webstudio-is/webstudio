import { describe, test, expect } from "vitest";
import {
  type PlanFeatures,
  type PlanConfig,
  defaultPlanFeatures,
  parsePlansEnv,
} from "./plan-features";

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

/** Helper to build expected PlanConfig objects in tests */
const planConfig = (
  name: string,
  features: PlanFeatures,
  prices: Record<string, string> = {}
): PlanConfig => ({ name, features, prices });

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

  test("extends-only entry (no features key) inherits parent features", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Pro", features: fullFeatures },
        { name: "LTD T2", extends: "Pro" },
      ])
    );
    expect(result.size).toBe(2);
    expect(result.get("LTD T2")).toEqual(planConfig("LTD T2", fullFeatures));
    expect(result.get("Pro")).toEqual(planConfig("Pro", fullFeatures));
  });

  test("entry with no features key and no extends resolves to defaultPlanFeatures", () => {
    const result = parsePlansEnv(JSON.stringify([{ name: "Free" }]));
    expect(result.size).toBe(1);
    expect(result.get("Free")).toEqual(planConfig("Free", defaultPlanFeatures));
  });

  test("extends: child inherits parent features and overrides specific fields", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Pro", features: fullFeatures },
        { name: "Team", extends: "Pro", features: { maxWorkspaces: 50 } },
      ])
    );
    expect(result.size).toBe(2);
    expect(result.get("Team")!.features.canDownloadAssets).toBe(true);
    expect(result.get("Team")!.features.maxWorkspaces).toBe(50);
    expect(result.get("Pro")!.features.maxWorkspaces).toBe(
      fullFeatures.maxWorkspaces
    );
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
    expect(result.get("Pro")).toEqual(planConfig("Pro", fullFeatures));
  });

  test("parses prices from entry", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        {
          name: "Pro",
          features: fullFeatures,
          prices: { monthly: "price_abc", yearly: "price_def" },
        },
      ])
    );
    expect(result.size).toBe(1);
    expect(result.get("Pro")!.prices).toEqual({
      monthly: "price_abc",
      yearly: "price_def",
    });
  });

  test("prices default to empty object when not provided", () => {
    const result = parsePlansEnv(`[${validEntry}]`);
    expect(result.get("Pro")!.prices).toEqual({});
  });

  test("skips entry with invalid prices (non-string value)", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Bad", features: fullFeatures, prices: { monthly: 123 } },
        { name: "Pro", features: fullFeatures },
      ])
    );
    expect(result.size).toBe(1);
    expect(result.get("Pro")).toBeDefined();
  });

  test("parses multiple valid entries", () => {
    const result = parsePlansEnv(twoEntries);
    expect(result.size).toBe(2);
    expect(result.get("Workspaces")!.features.maxWorkspaces).toBe(10);
  });

  test("skips entries with invalid features (wrong type), keeps valid ones", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Bad", features: { canDownloadAssets: "not-a-bool" } },
        { name: "Pro", features: fullFeatures },
      ])
    );
    expect(result.size).toBe(1);
    expect(result.get("Pro")).toEqual(planConfig("Pro", fullFeatures));
  });

  test("partial features without extends fills in from defaultPlanFeatures", () => {
    const result = parsePlansEnv(
      JSON.stringify([{ name: "Pro", features: { canDownloadAssets: true } }])
    );
    expect(result.size).toBe(1);
    expect(result.get("Pro")).toEqual(
      planConfig("Pro", { ...defaultPlanFeatures, canDownloadAssets: true })
    );
  });

  test("strips unknown keys from features", () => {
    const result = parsePlansEnv(
      JSON.stringify([
        { name: "Pro", features: { ...fullFeatures, admin: true } },
      ])
    );
    expect(result.size).toBe(1);
    expect(
      (result.get("Pro")!.features as Record<string, unknown>)["admin"]
    ).toBeUndefined();
  });
});
