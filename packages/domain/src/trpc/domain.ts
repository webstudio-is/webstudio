import { z } from "zod";
import { nanoid } from "nanoid";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { createProductionBuild } from "@webstudio-is/project-build/index.server";
import { router, procedure } from "@webstudio-is/trpc-interface/index.server";
import { Templates } from "@webstudio-is/sdk";
import { db } from "../db";

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
          templates: z.array(Templates),
        }),
      ])
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await projectDb.project.loadById(input.projectId, ctx);

        const name = `${project.id}-${nanoid()}.zip`;

        const domains: string[] = [];

        let hasCustomDomain = false;

        if (input.destination === "saas") {
          const currentProjectDomains = project.domainsVirtual;

          if (input.domains.includes(project.domain)) {
            domains.push(project.domain);
          }

          domains.push(
            ...input.domains.filter((domain) =>
              currentProjectDomains.some(
                (projectDomain) =>
                  projectDomain.domain === domain &&
                  projectDomain.status === "ACTIVE" &&
                  projectDomain.verified
              )
            )
          );

          hasCustomDomain = currentProjectDomains.some(
            (projectDomain) =>
              projectDomain.status === "ACTIVE" && projectDomain.verified
          );
        }

        const build = await createProductionBuild(
          {
            projectId: input.projectId,
            deployment:
              input.destination === "saas"
                ? {
                    destination: input.destination,
                    domains: domains,
                    assetsDomain: project.domain,
                    excludeWstdDomainFromSearch: hasCustomDomain,
                  }
                : {
                    destination: input.destination,
                    name,
                    assetsDomain: project.domain,
                    templates: input.templates,
                  },
          },
          ctx
        );

        const { deploymentTrpc, env } = ctx.deployment;

        console.info("input.destination", input.destination);

        if (env.BUILDER_ORIGIN === undefined) {
          throw new Error("Missing env.BUILDER_ORIGIN");
        }

        const result = await deploymentTrpc.publish.mutate({
          // used to load build data from the builder see routes/rest.build.$buildId.ts
          builderOrigin: env.BUILDER_ORIGIN,
          githubSha: env.GITHUB_SHA,
          buildId: build.id,
          // preview support
          branchName: env.GITHUB_REF_NAME,
          destination: input.destination,
          // action log helper (not used for deployment, but for action logs readablity)
          logProjectName: `${project.title} - ${project.id}`,
        });

        if (input.destination === "static" && result.success) {
          return { success: true as const, name };
        }

        return result;
      } catch (error) {
        console.error(error);
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
        domainId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.verify(
          {
            projectId: input.projectId,
            domainId: input.domainId,
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
        domainId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.remove(
          {
            projectId: input.projectId,
            domainId: input.domainId,
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
  countTotalDomains: procedure.query(async ({ ctx }) => {
    try {
      if (
        ctx.authorization.type !== "user" &&
        ctx.authorization.type !== "token"
      ) {
        throw new Error("Not authorized");
      }

      const ownerId =
        ctx.authorization.type === "user"
          ? ctx.authorization.userId
          : ctx.authorization.ownerId;

      const data = await db.countTotalDomains(ownerId, ctx);
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
