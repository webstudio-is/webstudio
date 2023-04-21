import { z } from "zod";
import {
  mergeRouters,
  router,
  procedure,
  projectRouter as baseProjectRouter,
} from "@webstudio-is/project/index.server";
import { db } from "../db";

const projectRouter = router({
  findMany: procedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await db.findMany(input.userId, ctx);
    }),
});

export const dashboardProjectRouter = mergeRouters(
  baseProjectRouter,
  projectRouter
);

export type DashboardProjectRouter = typeof dashboardProjectRouter;
