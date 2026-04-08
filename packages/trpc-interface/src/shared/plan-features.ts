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
  maxProjectsAllowedPerUser: 2,
  maxSeatsPerWorkspace: 0,
};

/** All user purchases (subscriptions and LTDs). subscriptionId present only for recurring subscriptions */
export type Purchase = {
  planName: string;
  subscriptionId?: string;
};
