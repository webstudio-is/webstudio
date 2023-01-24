import { prisma } from "@webstudio-is/prisma-client";
import {
  mergeRouters,
  router,
  procedure,
  projectRouter as baseProjectRouter,
} from "@webstudio-is/project/server";
import { z } from "zod";

const projectRouter = router({
  findMany: procedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // @todo find a better place for db operations specific to dashboard
      return await prisma.dashboardProject.findMany({
        where: {
          userId: input.userId,
          isDeleted: false,
        },
      });
    }),
});

export const dashboardProjectRouter = mergeRouters(
  baseProjectRouter,
  projectRouter
);

export type DashboardProjectRouter = typeof dashboardProjectRouter;
