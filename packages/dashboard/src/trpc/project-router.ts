import { z } from "zod";
import {
  router,
  procedure,
  mergeRouters,
} from "@webstudio-is/trpc-interface/index.server";
import { projectRouter as baseProjectRouter } from "@webstudio-is/project/index.server";

import { db } from "../db";

const projectRouter = router({
  findMany: procedure
    .input(z.object({ userId: z.string(), workspaceId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return await db.findMany(input.userId, ctx, input.workspaceId);
    }),

  findManyByIds: procedure
    .input(
      z.object({
        projectIds: z.array(z.string()),
        skipApprovalCheck: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await db.findManyByIds(input.projectIds, ctx, {
        skipApprovalCheck: input.skipApprovalCheck,
      });
    }),
});

export const dashboardProjectRouter = mergeRouters(
  baseProjectRouter,
  projectRouter
);

export type DashboardProjectRouter = typeof dashboardProjectRouter;
