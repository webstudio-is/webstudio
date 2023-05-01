import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { db } from "../db";
import { createProductionBuild } from "@webstudio-is/project-build/index.server";

const { router, procedure } = initTRPC.context<AppContext>().create();

export const domainRouter = router({
  project: procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const project = await projectDb.project.loadById(input.projectId, ctx);
        return {
          success: true,
          project,
        } as const;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),
  publish: procedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await createProductionBuild(
          {
            projectId: input.projectId,
          },
          ctx
        );

        const project = await projectDb.project.loadById(input.projectId, ctx);

        const { domainEnv } = ctx.domain;

        const headers = new Headers();

        headers.append("X-AUTH-WEBSTUDIO", domainEnv.PUBLISHER_TOKEN || "");
        headers.append("Content-Type", "text/plain");

        const url = new URL(domainEnv.BUILDER_ORIGIN);
        if (domainEnv.PUBLISHER_ENDPOINT === undefined) {
          return {
            success: false,
            error: "PUBLISHER_ENDPOINT is not defined",
          };
        }

        const response = await fetch(domainEnv.PUBLISHER_ENDPOINT, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            builderApiOrigin: url.origin,
            projectId: input.projectId,
            // @todo: useless and must be provided by the rest/project endpoint
            projectName: project.domain,
            // To support preview deployments
            // @todo: useless and must be provided by the rest/project endpoint
            branchName: domainEnv.BRANCH_NAME,
          }),
        });

        const text = await response.text();
        if (!response.ok) {
          throw new Error(text);
        }

        return { success: true } as const;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),
  updateProjectDomain: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await projectDb.project.updateDomain(
          {
            id: input.projectId,
            domain: input.domain,
          },
          ctx
        );
        return { success: true } as const;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
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

  verify: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.verify(
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
  remove: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.remove(
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
    .mutation(async ({ input, ctx }) => {
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
