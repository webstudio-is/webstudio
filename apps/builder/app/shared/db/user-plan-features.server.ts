import { prisma } from "@webstudio-is/prisma-client";

/**
 * Plan features are available on the client, do not use any secrets, 3rd party ids etc
 **/
export type UserPlanFeatures = {
  allowShareAdminLinks: boolean;
  maxDomainsAllowedPerUser: number;
  hasSubscription: boolean;
  hasProPlan: boolean;
};

// No strings - no secrets
({}) as UserPlanFeatures satisfies Record<string, boolean | number>;

export const getTokenPlanFeatures = async (token: string) => {
  const projectOwnerIdByToken = await prisma.authorizationToken.findUnique({
    where: {
      token,
    },
    select: {
      project: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (projectOwnerIdByToken === null) {
    throw new Error(`Project owner can't be found for token ${token}`);
  }

  const userId = projectOwnerIdByToken.project.userId;
  if (userId === null) {
    throw new Error(
      `Project ${projectOwnerIdByToken.project.id} has null instead of userId`
    );
  }

  return await getUserPlanFeatures(userId);
};

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
      maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
      hasSubscription,
      hasProPlan: true,
    };
  }

  return {
    allowShareAdminLinks: false,
    maxDomainsAllowedPerUser: 5,
    hasSubscription: false,
    hasProPlan: false,
  };
};
