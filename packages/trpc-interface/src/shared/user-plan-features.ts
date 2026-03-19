import { z } from "zod";

/**
 * Zod schema for validating partial plan features from external sources
 * (e.g. product.meta JSON blobs). Only known keys of the correct type
 * are kept — anything else is silently stripped.
 */
export const UserPlanFeaturesSchema = z.object({
  canDownloadAssets: z.boolean(),
  canRestoreBackups: z.boolean(),
  allowAdditionalPermissions: z.boolean(),
  allowDynamicData: z.boolean(),
  allowContentMode: z.boolean(),
  allowStagingPublish: z.boolean(),
  maxContactEmails: z.number().nonnegative(),
  maxDomainsAllowedPerUser: z.number().nonnegative(),
  maxPublishesAllowedPerUser: z.number().nonnegative(),
  maxWorkspaces: z.number().nonnegative(),
  maxProjectsAllowedPerUser: z.number().nonnegative(),
});

export type UserPlanFeatures = z.infer<typeof UserPlanFeaturesSchema>;

/** Most-restrictive (free) plan defaults — used when no user plan is available */
export const defaultUserPlanFeatures: UserPlanFeatures = {
  canDownloadAssets: false,
  canRestoreBackups: false,
  allowAdditionalPermissions: false,
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 0,
  maxPublishesAllowedPerUser: 10,
  maxWorkspaces: 1,
  maxProjectsAllowedPerUser: 2,
};

/** All user purchases (subscriptions and LTDs). subscriptionId present only for recurring subscriptions */
export type UserPurchase = {
  planName: string;
  subscriptionId?: string;
};
