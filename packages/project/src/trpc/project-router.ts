import * as db from "../db";
import { z } from "zod";
import { router, procedure } from "@webstudio-is/trpc-interface/index.server";
import { MarketplaceApprovalStatus, Title } from "../shared/schema";

export const projectRouter = router({
  rename: procedure
    .input(
      z.object({
        title: Title,
        projectId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // @todo pass ctx for authorization
      return await db.project.rename(input, ctx);
    }),
  delete: procedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // @todo pass ctx for authorization
      return await db.project.markAsDeleted(input.projectId, ctx);
    }),
  clone: procedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.optional(z.string()),
        authToken: z.optional(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sourceContext = input.authToken
        ? await ctx.createTokenContext(input.authToken)
        : ctx;

      return await db.project.clone(input, ctx, sourceContext);
    }),
  create: procedure
    .input(z.object({ title: Title }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.create(input, ctx);
    }),
  setMarketplaceApprovalStatus: procedure
    .input(
      z.object({
        projectId: z.string(),
        marketplaceApprovalStatus: MarketplaceApprovalStatus,
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.project.setMarketplaceApprovalStatus(input, ctx);
    }),
  findCurrentUserProjectIds: procedure.query(async ({ ctx }) => {
    if (ctx.authorization.type !== "user") {
      return [];
    }

    const projectIds = await db.project.findProjectIdsByUserId(
      ctx.authorization.userId,
      ctx
    );

    return projectIds.map((project) => project.id);
  }),

  userPublishCount: procedure.query(async ({ ctx }) => {
    try {
      if (
        ctx.authorization.type !== "user" &&
        ctx.authorization.type !== "token"
      ) {
        throw new Error("Not authorized");
      }
      const userId =
        ctx.authorization.type === "user"
          ? ctx.authorization.userId
          : ctx.authorization.ownerId;
      const result = await ctx.postgrest.client
        .from("user_publish_count")
        .select("count")
        .eq("user_id", userId)
        .maybeSingle();
      if (result.error) {
        throw result.error;
      }
      return {
        success: true,
        data: result.data?.count ?? 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as const;
    }
  }),
});

export type ProjectRouter = typeof projectRouter;
