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

export const getUserPlanFeatures = async (
  userId: string
): Promise<UserPlanFeatures> => {
  const transactionLog = await prisma.transactionLog.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      eventId: true,
      sessionId: true,
      createdAt: true,
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
  if (transactionLog.length > 0) {
    const hasSubscription = transactionLog.some(
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
