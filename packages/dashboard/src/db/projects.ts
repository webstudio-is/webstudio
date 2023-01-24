import { prisma } from "@webstudio-is/prisma-client";

export const findMany = async (userId: string) => {
  return await prisma.dashboardProject.findMany({
    where: {
      userId,
      isDeleted: false,
    },
  });
};
