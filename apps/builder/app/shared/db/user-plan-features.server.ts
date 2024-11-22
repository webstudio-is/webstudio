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
    .select("name")
    .in(
      "id",
      userProducts.map(({ productId }) => productId)
    );

  if (productsResult.error) {
    console.error(productsResult.error);
    throw new Error("Failed to fetch products");
  }

  const products = productsResult.data;

  // This is fast and dirty implementation
  // @todo: implement this using products meta, custom table with aggregated transaction info
  if (userProducts.length > 0) {
    const hasSubscription = userProducts.some(
      (log) => log.subscriptionId !== null
    );

    return {
      allowShareAdminLinks: true,
      allowDynamicData: true,
      maxContactEmails: 5,
      maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
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
      hasSubscription: true,
      hasProPlan: true,
      planName: "env.USER_PLAN Pro",
    };
  }

  return {
    allowShareAdminLinks: false,
    allowDynamicData: false,
    maxContactEmails: 0,
    maxDomainsAllowedPerUser: 1,
    hasSubscription: false,
    hasProPlan: false,
  };
};
