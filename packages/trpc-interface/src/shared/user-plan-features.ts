export type UserPlanFeatures = {
  canDownloadAssets: boolean;
  canRestoreBackups: boolean;
  allowAdditionalPermissions: boolean;
  allowDynamicData: boolean;
  allowContentMode: boolean;
  allowStagingPublish: boolean;
  maxContactEmails: number;
  maxDomainsAllowedPerUser: number;
  maxPublishesAllowedPerUser: number;
  maxWorkspaces: number;
  maxProjectsAllowedPerUser: number;
};

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
