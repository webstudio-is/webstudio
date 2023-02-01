import { prisma } from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface/server";

export const findMany = async (userId: string, context: AppContext) => {
  return await prisma.dashboardProject.findMany({
    where: {
      userId,
      isDeleted: false,
    },
  });
};
