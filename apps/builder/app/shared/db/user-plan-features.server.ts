import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";

export type UserPlanFeatures = NonNullable<AppContext["userPlanFeatures"]>;

export const getUserPlanFeatures = async (
  userId: string,
  postgrest: AppContext["postgrest"]
): Promise<UserPlanFeatures> => {
  const userProductsResult = await postgrest.client
    .from("UserProduct")
    .select("customerId, subscriptionId, productId")
    .eq("userId", userId);

  if (userProductsResult.error) {
    console.error(userProductsResult.error);
    throw new Error("Failed to fetch user products");
  }

  const userProducts = userProductsResult.data;

  const productsResult = await postgrest.client
    .from("Product")
    .select("id, name, meta")
    .in(
      "id",
      userProducts.map(({ productId }) => productId ?? "")
    );

  if (productsResult.error) {
    console.error(productsResult.error);
    throw new Error("Failed to fetch products");
  }

  const products = productsResult.data;

  // Create a map of productId -> product name for quick lookup
  const productIdToName = new Map<string, string>();
  for (const product of products) {
    productIdToName.set(product.id, product.name);
  }

  // Build purchases array - includes all products (subscriptions and LTDs)
  // subscriptionId only set for recurring subscriptions (manageable in Stripe)
  const purchases: Array<{
    planName: string;
    subscriptionId?: string;
  }> = [];
  for (const userProduct of userProducts) {
    if (userProduct.productId) {
      const planName = productIdToName.get(userProduct.productId) ?? "Pro";
      purchases.push({
        planName,
        subscriptionId: userProduct.subscriptionId ?? undefined,
      });
    }
  }

  if (userProducts.length > 0) {
    const productMetas = products.map((product) => {
      return {
        allowAdditionalPermissions: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
        ...(product.meta as Partial<UserPlanFeatures>),
      };
    });
    return {
      allowAdditionalPermissions: productMetas.some(
        (item) => item.allowAdditionalPermissions
      ),
      allowDynamicData: productMetas.some((item) => item.allowDynamicData),
      allowContentMode: productMetas.some((item) => item.allowContentMode),
      allowStagingPublish: productMetas.some(
        (item) => item.allowStagingPublish
      ),
      maxContactEmails: Math.max(
        ...productMetas.map((item) => item.maxContactEmails)
      ),
      maxDomainsAllowedPerUser: Math.max(
        ...productMetas.map((item) => item.maxDomainsAllowedPerUser)
      ),
      maxPublishesAllowedPerUser: Math.max(
        ...productMetas.map((item) => item.maxPublishesAllowedPerUser)
      ),
      purchases,
    };
  }

  if (env.USER_PLAN === "pro") {
    return {
      allowAdditionalPermissions: true,
      allowDynamicData: true,
      allowContentMode: true,
      allowStagingPublish: true,
      maxContactEmails: 5,
      maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
      maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
      purchases: [{ planName: "env.USER_PLAN Pro" }],
    };
  }

  return {
    allowAdditionalPermissions: false,
    allowDynamicData: false,
    allowContentMode: false,
    allowStagingPublish: false,
    maxContactEmails: 0,
    maxDomainsAllowedPerUser: 0,
    maxPublishesAllowedPerUser: 10,
    purchases: [],
  };
};
