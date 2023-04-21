import { prisma } from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { DashboardProjects } from "./schema";

export const findMany = async (userId: string, context: AppContext) => {
  const data = await prisma.dashboardProject.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
  });

  return DashboardProjects.parse(data);
};
