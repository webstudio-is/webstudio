import { z } from "zod";
import { nanoid } from "nanoid";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  createProductionBuild,
  unpublishBuild,
} from "@webstudio-is/project-build/index.server";
import {
  router,
  procedure,
  createErrorResponse,
} from "@webstudio-is/trpc-interface/index.server";
import { Templates } from "@webstudio-is/sdk";
import { db } from "../db";
import { isDomainUsingCloudflareNameservers } from "../rdap";

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
      return createErrorResponse(error);
    }
  }),

  findDomainRegistrar: procedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ input }) => {
      const isCloudflare = await isDomainUsingCloudflareNameservers(
        input.domain
      );
      return {
        known: isCloudflare !== undefined,
        cnameFlattening: isCloudflare === true,
      };
    }),

  project: procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const project = await projectApi.loadById(input.projectId, ctx);

        return {
          success: true,
          project,
        } as const;
      } catch (error) {
        return createErrorResponse(error);
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
        const project = await projectApi.loadById(input.projectId, ctx);

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
        return createErrorResponse(error);
      }
    }),
  /**
   * Unpublish a specific domain from the project
   */
  unpublish: procedure
    .input(
      z.object({
        projectId: z.string(),
        domain: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { deploymentTrpc, env } = ctx.deployment;

        // Call deployment service to delete the worker for this domain
        const result = await deploymentTrpc.unpublish.mutate({
          domain: input.domain,
        });

        // Extract subdomain for DB lookup (strip publisher host suffix)
        // e.g., "myproject.wstd.work" → "myproject", "custom.com" → "custom.com"
        const dbDomain = input.domain.replace(`.${env.PUBLISHER_HOST}`, "");

        // Always unpublish in DB regardless of worker deletion result
        await unpublishBuild(
          { projectId: input.projectId, domain: dbDomain },
          ctx
        );

        // If worker deletion failed (and not NOT_IMPLEMENTED), return error
        if (result.success === false && result.error !== "NOT_IMPLEMENTED") {
          return {
            success: false,
            message: `Failed to unpublish ${input.domain}: ${result.error}`,
          };
        }

        return {
          success: true,
          message: `${input.domain} unpublished`,
        };
      } catch (error) {
        console.error("Unpublish failed:", error);
        return {
          success: false,
          message: `Failed to unpublish ${input.domain}: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
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
        await projectApi.updateDomain(
          {
            id: input.projectId,
            domain: input.domain,
          },
          ctx
        );

        return { success: true } as const;
      } catch (error) {
        return createErrorResponse(error);
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
        return createErrorResponse(error);
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
        return createErrorResponse(error);
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
        return createErrorResponse(error);
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
      return createErrorResponse(error);
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
        return createErrorResponse(error);
      }
    }),
});

export type DomainRouter = typeof domainRouter;
