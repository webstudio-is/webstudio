import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  type UserPlanFeatures,
  UserPlanFeaturesSchema,
} from "@webstudio-is/trpc-interface/user-plan-features";
import env from "~/env/env.server";

type UserPlanInfo = {
  userPlanFeatures: UserPlanFeatures;
  purchases: AppContext["purchases"];
};

/**
 * Safely extract known plan-feature overrides from an untyped product.meta blob.
 * Unknown keys are stripped; invalid values fall back to the caller's defaults.
 */
const parseProductMeta = (meta: unknown): Partial<UserPlanFeatures> => {
  const result = UserPlanFeaturesSchema.partial().safeParse(meta);
  return result.success ? result.data : {};
};

/** Pro plan defaults — used when a product doesn't override a field */
const proPlanDefaults = (maxWorkspaces: number): UserPlanFeatures => ({
  canDownloadAssets: true,
  canRestoreBackups: true,
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmails: 5,
  maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
  maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
  maxWorkspaces,
  maxProjectsAllowedPerUser: Number.MAX_SAFE_INTEGER,
  maxSeats: Number.MAX_SAFE_INTEGER,
});

/**
 * Merge plan features from multiple products.
 * Booleans: user has the feature if ANY product grants it (.some).
 * Numbers: user gets the highest limit across products (.max).
 */
const mergeProductMetas = (
  productMetas: UserPlanFeatures[]
): UserPlanFeatures => {
  if (productMetas.length === 0) {
    return proPlanDefaults(env.MAX_WORKSPACES);
  }

  return {
    canDownloadAssets: productMetas.some((item) => item.canDownloadAssets),
    canRestoreBackups: productMetas.some((item) => item.canRestoreBackups),
    allowAdditionalPermissions: productMetas.some(
      (item) => item.allowAdditionalPermissions
    ),
    allowDynamicData: productMetas.some((item) => item.allowDynamicData),
    allowContentMode: productMetas.some((item) => item.allowContentMode),
    allowStagingPublish: productMetas.some((item) => item.allowStagingPublish),
    maxContactEmails: Math.max(
      ...productMetas.map((item) => item.maxContactEmails)
    ),
    maxDomainsAllowedPerUser: Math.max(
      ...productMetas.map((item) => item.maxDomainsAllowedPerUser)
    ),
    maxPublishesAllowedPerUser: Math.max(
      ...productMetas.map((item) => item.maxPublishesAllowedPerUser)
    ),
    maxWorkspaces: Math.max(...productMetas.map((item) => item.maxWorkspaces)),
    maxProjectsAllowedPerUser: Math.max(
      ...productMetas.map((item) => item.maxProjectsAllowedPerUser)
    ),
    maxSeats: Math.max(...productMetas.map((item) => item.maxSeats)),
  };
};

export const getUserPlanInfo = async (
  userId: string,
  postgrest: AppContext["postgrest"]
): Promise<UserPlanInfo> => {
  const userProductsResult = await postgrest.client
    .from("UserProduct")
    .select("customerId, subscriptionId, productId")
    .eq("userId", userId);

  if (userProductsResult.error) {
    console.error(userProductsResult.error);
    throw new Error("Failed to fetch user products");
  }

  const userProducts = userProductsResult.data;

  // Filter out null/undefined productIds before querying
  const productIds = userProducts.flatMap(({ productId }) =>
    productId !== null && productId !== undefined ? [productId] : []
  );

  // Build purchases array - includes all products (subscriptions and LTDs)
  // subscriptionId only set for recurring subscriptions (manageable in Stripe)
  const buildPurchases = (
    productIdToName: Map<string, string>
  ): UserPlanInfo["purchases"] => {
    const purchases: UserPlanInfo["purchases"] = [];
    for (const userProduct of userProducts) {
      if (userProduct.productId) {
        const planName = productIdToName.get(userProduct.productId) ?? "Pro";
        purchases.push({
          planName,
          subscriptionId: userProduct.subscriptionId ?? undefined,
        });
      }
    }
    return purchases;
  };

  if (productIds.length > 0) {
    const productsResult = await postgrest.client
      .from("Product")
      .select("id, name, meta")
      .in("id", productIds);

    if (productsResult.error) {
      console.error(productsResult.error);
      throw new Error("Failed to fetch products");
    }

    const products = productsResult.data;
    const productIdToName = new Map(products.map((p) => [p.id, p.name]));
    const defaults = proPlanDefaults(env.MAX_WORKSPACES);

    const productMetas = products.map((product) => ({
      ...defaults,
      ...parseProductMeta(product.meta),
    }));

    return {
      userPlanFeatures: mergeProductMetas(productMetas),
      purchases: buildPurchases(productIdToName),
    };
  }

  if (env.USER_PLAN === "pro") {
    return {
      userPlanFeatures: proPlanDefaults(env.MAX_WORKSPACES),
      purchases: [{ planName: "Pro" }],
    };
  }

  return {
    userPlanFeatures: {
      canDownloadAssets: false,
      canRestoreBackups: false,
      allowAdditionalPermissions: false,
      allowDynamicData: false,
      allowContentMode: false,
      allowStagingPublish: false,
      maxContactEmails: 0,
      maxDomainsAllowedPerUser: 0,
      maxPublishesAllowedPerUser: 10,
      maxWorkspaces: env.MAX_WORKSPACES,
      maxProjectsAllowedPerUser: 2,
      maxSeats: 0,
    },
    purchases: [],
  };
};

export const __testing__ = {
  parseProductMeta,
  proPlanDefaults,
  mergeProductMetas,
};
