import { z } from "zod";

/**
 * Zod schema for validating partial plan features from external sources
 * (e.g. product.meta JSON blobs). Only known keys of the correct type
 * are kept — anything else is silently stripped.
 */
export const PlanFeaturesSchema = z.object({
  canDownloadAssets: z.boolean(),
  canRestoreBackups: z.boolean(),
  allowAdditionalPermissions: z.boolean(),
  allowDynamicData: z.boolean(),
  allowContentMode: z.boolean(),
  allowStagingPublish: z.boolean(),
  maxContactEmailsPerProject: z.number().nonnegative(),
  maxDomainsAllowedPerUser: z.number().nonnegative(),
  maxDailyPublishesPerUser: z.number().nonnegative(),
  maxWorkspaces: z.number().nonnegative(),
  maxProjectsAllowedPerUser: z.number().nonnegative(),
  maxAssetsPerProject: z.number().nonnegative(),
  seatsIncluded: z.number().nonnegative(),
  maxSeatsPerWorkspace: z.number().nonnegative(),
});

export type PlanFeatures = z.infer<typeof PlanFeaturesSchema>;

// Compile-time guard: all PlanFeatures values must be boolean or number.
// If a new field with a different type is added to PlanFeaturesSchema, this line will error.
type _AssertBooleanOrNumber =
  PlanFeatures extends Record<string, boolean | number> ? true : never;
const _checkPlanFeaturesValueTypes: _AssertBooleanOrNumber = true;
void _checkPlanFeaturesValueTypes;

/** Default (free) plan — the baseline, all features disabled / at minimum limits */
export const defaultPlanFeatures: PlanFeatures = {
  canDownloadAssets: false,
  canRestoreBackups: false,
  allowAdditionalPermissions: false,
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  maxContactEmailsPerProject: 0,
  maxDomainsAllowedPerUser: 0,
  maxDailyPublishesPerUser: 10,
  maxWorkspaces: 1,
  maxProjectsAllowedPerUser: 100,
  maxAssetsPerProject: 50,
  seatsIncluded: 0,
  maxSeatsPerWorkspace: 0,
};

/** All user purchases (subscriptions and LTDs). subscriptionId present only for recurring subscriptions */
export type Purchase = {
  planName: string;
  subscriptionId?: string;
};

const PricesSchema = z.record(z.string(), z.string());

/** A parsed plan entry with resolved features and price IDs keyed by billing cycle */
export type PlanConfig = {
  name: string;
  features: PlanFeatures;
  prices: Record<string, string>;
};

/**
 * Parse the PLANS env variable (JSON array of {name, extends?, features, prices?}).
 * - features is partial when extends is used; the parent plan fills in the rest.
 * - The final merged features are validated against the full PlanFeaturesSchema.
 * - Invalid entries are skipped with a console.error.
 * - An extends reference to an unknown plan name throws an error.
 * Returns a Map of plan name → { name, features, prices }.
 */
export const parsePlansEnv = (raw: string): Map<string, PlanConfig> => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Map();
    }

    type PlanEntry = {
      name: string;
      extends?: string;
      features: Partial<PlanFeatures>;
      prices: Record<string, string>;
    };

    // First pass: validate entry structure and collect partial features.
    const entries: PlanEntry[] = parsed.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.name !== "string"
      ) {
        console.error("Invalid PLANS entry (missing name):", item);
        return [];
      }
      if ("extends" in item && typeof item.extends !== "string") {
        console.error("Invalid PLANS entry (extends must be a string):", item);
        return [];
      }
      const featuresResult = PlanFeaturesSchema.partial().safeParse(
        "features" in item ? item.features : {}
      );
      if (!featuresResult.success) {
        console.error(
          `Invalid PLANS entry "${item.name}" features:`,
          featuresResult.error.flatten()
        );
        return [];
      }
      const pricesResult = PricesSchema.safeParse(
        "prices" in item ? item.prices : {}
      );
      if (!pricesResult.success) {
        console.error(
          `Invalid PLANS entry "${item.name}" prices:`,
          pricesResult.error.flatten()
        );
        return [];
      }
      return [
        {
          name: item.name,
          extends: "extends" in item ? (item.extends as string) : undefined,
          features: featuresResult.data,
          prices: pricesResult.data,
        } satisfies PlanEntry,
      ];
    });

    // Build name → partial features map for resolving extends.
    const byName = new Map<string, Partial<PlanFeatures>>(
      entries.map((e) => [e.name, e.features])
    );

    // Second pass: resolve extends and validate the full feature set.
    // Every entry implicitly extends defaultPlanFeatures; "extends" picks a named plan on top of that.
    const resolved = new Map<string, PlanConfig>();
    for (const entry of entries) {
      if (entry.extends !== undefined && !byName.has(entry.extends)) {
        throw new Error(
          `PLANS entry "${entry.name}" extends unknown plan "${entry.extends}"`
        );
      }
      const parentFeatures: PlanFeatures =
        entry.extends === undefined
          ? defaultPlanFeatures
          : { ...defaultPlanFeatures, ...byName.get(entry.extends)! };
      const result = PlanFeaturesSchema.safeParse({
        ...parentFeatures,
        ...entry.features,
      });
      if (!result.success) {
        console.error(
          `Invalid PLANS entry "${entry.name}" features after resolving extends:`,
          result.error.flatten()
        );
        continue;
      }
      resolved.set(entry.name, {
        name: entry.name,
        features: result.data,
        prices: entry.prices,
      });
    }
    return resolved;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PLANS entry")) {
      throw error;
    }
    return new Map();
  }
};
