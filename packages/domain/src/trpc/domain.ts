import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { db } from "../db";
import { createProductionBuild } from "@webstudio-is/project-build/index.server";

const { router, procedure } = initTRPC.context<AppContext>().create();

const EntryResponse = z.object({
  auth_token: z.string(),
});

export const domainRouter = router({
  getEntriToken: procedure.query(async ({ ctx }) => {
    try {
      const {
        env: { ENTRI_APPLICATION_ID, ENTRI_SECRET },
      } = ctx.entri;

      if (ENTRI_SECRET === undefined) {
        throw new Error(`ENTRI_SECRET is not defined`);
      }

      const entryResponse = await fetch("https://api.goentri.com/token", {
        method: "POST",
        body: JSON.stringify({
          // These values come from the Entri dashboard
          applicationId: ENTRI_APPLICATION_ID,
          secret: ENTRI_SECRET,
        }),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (entryResponse.ok === false) {
        throw new Error(`Entri API error: ${await entryResponse.text()}`);
      }

      const entryJson = await entryResponse.json();
      const responseData = EntryResponse.parse(entryJson);

      return {
        success: true,
        token: responseData.auth_token,
        applicationId: ENTRI_APPLICATION_ID,
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
    .input(z.object({ projectId: z.string(), domains: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await projectDb.project.loadById(input.projectId, ctx);

        const build = await createProductionBuild(
          {
            projectId: input.projectId,
            deployment: {
              domains: input.domains,
              projectDomain: project.domain,
            },
          },
          ctx
        );

        const { deploymentTrpc, env } = ctx.deployment;

        const result = deploymentTrpc.publish.mutate({
          // used to load build data from the builder see routes/rest.build.$buildId.ts
          builderApiOrigin: env.BUILDER_ORIGIN,
          buildId: build.id,
          // preview support
          branchName: env.BRANCH_NAME,
          // action log helper (not used for deployment, but for action logs readablity)
          projectDomainName: project.domain,
        });

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
