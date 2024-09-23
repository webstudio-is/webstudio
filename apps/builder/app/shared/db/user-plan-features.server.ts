import { prisma } from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";

export type UserPlanFeatures = NonNullable<AppContext["userPlanFeatures"]>;

export const getUserPlanFeatures = async (
  userId: string
): Promise<UserPlanFeatures> => {
  const userProducts = await prisma.userProduct.findMany({
    where: { userId },
    select: {
      customerId: true,
      subscriptionId: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          features: true,
          meta: true,
          images: true,
        },
      },
    },
  });

  // This is fast and dirty implementation
  // @todo: implement this using products meta, custom table with aggregated transaction info
  if (userProducts.length > 0) {
    const hasSubscription = userProducts.some(
      (log) => log.subscriptionId !== null
    );

    return {
      allowShareAdminLinks: true,
      allowDynamicData: true,
      allowContactEmail: true,
      maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
      hasSubscription,
      hasProPlan: true,
      planName: userProducts[0].product.name,
    };
  }

  if (env.USER_PLAN === "pro") {
    return {
      allowShareAdminLinks: true,
      allowDynamicData: true,
      allowContactEmail: true,
      maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
      hasSubscription: true,
      hasProPlan: true,
      planName: "env.USER_PLAN Pro",
    };
  }

  return {
    allowShareAdminLinks: false,
    allowDynamicData: false,
    allowContactEmail: false,
    maxDomainsAllowedPerUser: 1,
    hasSubscription: false,
    hasProPlan: false,
  };
};
