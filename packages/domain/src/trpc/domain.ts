import { z } from "zod";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  router,
  procedure,
  createErrorResponse,
  authorizeProject,
  getProjectOwnerId,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { templates } from "@webstudio-is/sdk";
import { db } from "../db";
import { isDomainUsingCloudflareNameservers } from "../rdap";
import {
  getVerifiedPublishDomains,
  createProjectDomainResult,
  deleteProjectDomainResult,
  publishProject,
  publishStaticProject,
  unpublishProjectDomains,
  verifyProjectDomainResult,
} from "../project-domain-api.server";

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
          templates: z.array(templates),
        }),
      ])
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.destination === "saas") {
          const project = await projectApi.loadById(input.projectId, ctx);
          const domains = getVerifiedPublishDomains(project, input.domains);
          await publishProject({ project, domains }, ctx);
          return { success: true as const };
        }

        const result = await publishStaticProject(
          {
            projectId: input.projectId,
            templates: input.templates,
          },
          ctx
        );

        if (result.success) {
          return { success: true as const, name: result.name };
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
        await unpublishProjectDomains(
          {
            projectId: input.projectId,
            domains: [input.domain],
          },
          ctx
        );

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
        return await createProjectDomainResult(
          {
            projectId: input.projectId,
            domain: input.domain,
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
        return await verifyProjectDomainResult(
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
        return await deleteProjectDomainResult(
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
  countTotalDomains: procedure
    .input(z.object({ projectId: z.string() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        if (
          ctx.authorization.type !== "user" &&
          ctx.authorization.type !== "token"
        ) {
          throw new Error("Not authorized");
        }

        let ownerId =
          ctx.authorization.type === "user"
            ? ctx.authorization.userId
            : ctx.authorization.ownerId;

        if (input?.projectId !== undefined) {
          const canView = await authorizeProject.hasProjectPermit(
            { projectId: input.projectId, permit: "view" },
            ctx
          );

          if (canView === false) {
            throw new AuthorizationError(
              "Not authorized to access this project"
            );
          }

          ownerId = await getProjectOwnerId(input.projectId, ctx);
        }

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
