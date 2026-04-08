import { z } from "zod";
import {
  router,
  procedure,
  createErrorResponse,
} from "@webstudio-is/trpc-interface/index.server";
import { workspace as workspaceApi } from "@webstudio-is/project/index.server";
import { getPlanInfo } from "~/shared/db/plan-features.server";
import { updateSeats } from "~/shared/payment-worker.server";
import { roles } from "@webstudio-is/trpc-interface/authorize";

const Name = z.string().min(2).max(100);
const Relation = z.enum(roles);

/**
 * Syncs the Stripe seat quantity for the owner of a given workspace.
 * Called after adding or removing members.
 * Throws on payment worker errors so the caller can decide whether to soft-fail.
 */
const syncOwnerSeats = async (
  workspaceId: string,
  ctx: Parameters<typeof workspaceApi.countAllMembers>[1]
) => {
  const workspaceResult = await ctx.postgrest.client
    .from("Workspace")
    .select("userId")
    .eq("id", workspaceId)
    .eq("isDeleted", false)
    .maybeSingle();

  if (workspaceResult.error || workspaceResult.data === null) {
    return;
  }

  const ownerId = workspaceResult.data.userId;
  const planInfo = await getPlanInfo(ownerId, ctx.postgrest);
  const { planFeatures, purchases } = planInfo;

  const subscription = purchases.find((p) => p.subscriptionId !== undefined);
  if (subscription?.subscriptionId === undefined) {
    return;
  }

  const memberCount = await workspaceApi.countAllMembers(ownerId, ctx);

  const result = await updateSeats({
    userId: ownerId,
    subscriptionId: subscription.subscriptionId,
    newQuantity: memberCount,
    minSeats: planFeatures.minSeats,
    maxSeats: planFeatures.maxSeats,
  });

  if (result === null) {
    return;
  }

  if (result.type === "error") {
    throw new Error(`Payment worker rejected seat update: ${result.error}`);
  }
};

export const workspaceRouter = router({
  create: procedure
    .input(z.object({ name: Name }))
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await workspaceApi.create(
          { ...input, maxWorkspaces: ctx.planFeatures.maxWorkspaces },
          ctx
        );
        return { success: true as const, data: workspace };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  rename: procedure
    .input(z.object({ workspaceId: z.string(), name: Name }))
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await workspaceApi.rename(input, ctx);
        return { success: true as const, data: workspace };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  delete: procedure
    .input(
      z.object({
        workspaceId: z.string(),
        deleteProjects: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await workspaceApi.remove(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  list: procedure.query(async ({ ctx }) => {
    try {
      if (ctx.authorization.type !== "user") {
        return { success: true as const, data: [] };
      }
      const workspaces = await workspaceApi.findMany(
        ctx.authorization.userId,
        ctx
      );
      return { success: true as const, data: workspaces };
    } catch (error) {
      return createErrorResponse(error);
    }
  }),

  addMember: procedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
        relation: Relation,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (ctx.planFeatures.maxWorkspaces <= 1) {
          throw new Error("Upgrade your plan to invite members to workspaces.");
        }

        const { notificationId } = await workspaceApi.addMember(input, ctx);

        // Charge the seat at invite time (Figma model).
        // Soft-fail: the invite is already created, billing is best-effort.
        await syncOwnerSeats(input.workspaceId, ctx).catch((error) => {
          console.error(
            "[payment-worker] Failed to bill seat on invite:",
            error
          );
        });

        return { success: true as const, notificationId };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  updateRole: procedure
    .input(
      z.object({
        workspaceId: z.string(),
        memberUserId: z.string(),
        relation: Relation,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (ctx.planFeatures.maxWorkspaces <= 1) {
          throw new Error(
            "Upgrade your plan to manage workspace member roles."
          );
        }
        await workspaceApi.updateRole(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  removeMember: procedure
    .input(z.object({ workspaceId: z.string(), memberUserId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await workspaceApi.removeMember(input, ctx);

        // Release the seat immediately on removal.
        await syncOwnerSeats(input.workspaceId, ctx).catch((error) => {
          console.error(
            "[payment-worker] Failed to release seat on member removal:",
            error
          );
        });

        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  listMembers: procedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const members = await workspaceApi.listMembers(input, ctx);
        return { success: true as const, data: members };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  moveProject: procedure
    .input(
      z.object({
        projectId: z.string(),
        targetWorkspaceId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const targetWorkspace = await ctx.postgrest.client
          .from("Workspace")
          .select("userId")
          .eq("id", input.targetWorkspaceId)
          .eq("isDeleted", false)
          .maybeSingle();

        if (targetWorkspace.error) {
          throw targetWorkspace.error;
        }

        if (targetWorkspace.data === null) {
          throw new Error("Target workspace not found");
        }

        const ownerPlan = await ctx.getOwnerPlanFeatures(
          targetWorkspace.data.userId
        );

        if (ownerPlan.maxWorkspaces <= 1) {
          throw new Error(
            "Upgrade your plan to move projects between workspaces."
          );
        }
        await workspaceApi.moveProject(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  transferProject: procedure
    .input(
      z.object({
        projectId: z.string(),
        recipientEmail: z.string().email(),
        targetWorkspaceId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await workspaceApi.transferProject(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  findSharedWorkspacesByOwnerEmail: procedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input, ctx }) => {
      try {
        const workspaces = await workspaceApi.findSharedWorkspacesByOwnerEmail(
          input,
          ctx
        );
        return { success: true as const, data: workspaces };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),
});

export type WorkspaceRouter = typeof workspaceRouter;
