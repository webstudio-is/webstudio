import { z } from "zod";

import { db as projectDb } from "@webstudio-is/project/index.server";
import { db } from "../db";
import { createProductionBuild } from "@webstudio-is/project-build/index.server";
import { router, procedure } from "@webstudio-is/trpc-interface/index.server";
import { nanoid } from "nanoid";

export const domainRouter = router({
  getEntriToken: procedure.query(async ({ ctx }) => {
    try {
      const result = await ctx.entri.entryApi.getEntriToken();

      return {
        success: true,
        token: result.token,
        applicationId: result.applicationId,
      } as const;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as const;
    }
  }),

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
    .input(
      z.discriminatedUnion("destination", [
        z.object({
          projectId: z.string(),
          domains: z.array(z.string()),
          destination: z.literal("saas"),
        }),
        z.object({
          projectId: z.string(),
          destination: z.literal("static"),
        }),
      ])
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await projectDb.project.loadById(input.projectId, ctx);

        const name = `${project.id}-${nanoid()}.zip`;

        const build = await createProductionBuild(
          {
            projectId: input.projectId,
            deployment:
              input.destination === "saas"
                ? {
                    destination: input.destination,
                    domains: input.domains,
                    projectDomain: project.domain,
                  }
                : {
                    destination: input.destination,
                    name,
                    assetsDomain: project.domain,
                    templates: ["ssg"],
                  },
          },
          ctx
        );

        const { deploymentTrpc, env } = ctx.deployment;

        console.info("input.destination", input.destination);

        const result = await deploymentTrpc.publish.mutate({
          // used to load build data from the builder see routes/rest.build.$buildId.ts
          builderOrigin: env.BUILDER_ORIGIN,
          githubSha: env.GITHUB_SHA,
          buildId: build.id,
          // preview support
          branchName: env.GITHUB_REF_NAME,
          destination: input.destination,
          // action log helper (not used for deployment, but for action logs readablity)
          projectDomainName: project.domain,
        });

        if (input.destination === "static" && result.success) {
          return { success: true as const, name };
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),
  /**
   * Update *.wstd.* domain
   */
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

  /**
   * Creates 2 entries in the database:
   * at the "domain" table and at the "projectDomain" table
   */
  create: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { userPlanFeatures } = ctx;
        if (userPlanFeatures === undefined) {
          throw new Error("Missing userPlanFeatures");
        }

        return await db.create(
          {
            projectId: input.projectId,
            domain: input.domain,
            maxDomainsAllowedPerUser: userPlanFeatures.maxDomainsAllowedPerUser,
          },
          ctx
        );
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
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
        } as const;
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
        } as const;
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

  countTotalDomains: procedure.query(async ({ ctx }) => {
    try {
      if (ctx.authorization.userId === undefined) {
        throw new Error("Not authorized");
      }
      const data = await db.countTotalDomains(ctx.authorization.userId);
      return { success: true, data } as const;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as const;
    }
  }),

  updateStatus: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.updateStatus(
          { projectId: input.projectId, domain: input.domain },
          ctx
        );
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),
});

export type DomainRouter = typeof domainRouter;
