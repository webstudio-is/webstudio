import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { db } from "../db";

const { router, procedure } = initTRPC.context<AppContext>().create();

export const domainRouter = router({
  start: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.start(
          {
            projectId: input.projectId,
            domain: input.domain,
            maxDomainsAllowedPerUser: 5,
          },
          ctx
        );
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  create: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.create(
          {
            projectId: input.projectId,
            domain: input.domain,
          },
          ctx
        );
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  findMany: procedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return await db.findMany({ projectId: input.projectId }, ctx);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),

  refresh: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return await db.refresh(
          { projectId: input.projectId, domain: input.domain },
          ctx
        );
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});

export type DomainRouter = typeof domainRouter;
