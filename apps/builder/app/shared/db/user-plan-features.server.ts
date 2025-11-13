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
    .select("name, meta")
    .in(
      "id",
      userProducts.map(({ productId }) => productId ?? "")
    );

  if (productsResult.error) {
    console.error(productsResult.error);
    throw new Error("Failed to fetch products");
  }

  const products = productsResult.data;

  if (userProducts.length > 0) {
    const hasSubscription = userProducts.some(
      (log) => log.subscriptionId !== null
    );
    const productMetas = products.map((product) => {
      return {
        allowShareAdminLinks: true,
        allowDynamicData: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
        ...(product.meta as Partial<UserPlanFeatures>),
      };
    });
    return {
      allowShareAdminLinks: productMetas.some(
        (item) => item.allowShareAdminLinks
      ),
      allowDynamicData: productMetas.some((item) => item.allowDynamicData),
      maxContactEmails: Math.max(
        ...productMetas.map((item) => item.maxContactEmails)
      ),
      maxDomainsAllowedPerUser: Math.max(
        ...productMetas.map((item) => item.maxDomainsAllowedPerUser)
      ),
      maxPublishesAllowedPerUser: Math.max(
        ...productMetas.map((item) => item.maxPublishesAllowedPerUser)
      ),
      hasSubscription,
      hasProPlan: true,
      planName: products[0].name,
    };
  }

  if (env.USER_PLAN === "pro") {
    return {
      allowShareAdminLinks: true,
      allowDynamicData: true,
      maxContactEmails: 5,
      maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
      maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
      hasSubscription: true,
      hasProPlan: true,
      planName: "env.USER_PLAN Pro",
    };
  }

  return {
    allowShareAdminLinks: false,
    allowDynamicData: false,
    maxContactEmails: 0,
    maxDomainsAllowedPerUser: 0,
    maxPublishesAllowedPerUser: 10,
    hasSubscription: false,
    hasProPlan: false,
  };
};
