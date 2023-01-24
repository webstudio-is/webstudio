import {
  mergeRouters,
  router,
  procedure,
  projectRouter as baseProjectRouter,
} from "@webstudio-is/project/server";
import { db } from "../db";
import { z } from "zod";

const projectRouter = router({
  findMany: procedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await db.findMany(input.userId);
    }),
});

export const dashboardProjectRouter = mergeRouters(
  baseProjectRouter,
  projectRouter
);

export type DashboardProjectRouter = typeof dashboardProjectRouter;
