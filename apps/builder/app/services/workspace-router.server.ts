import { z } from "zod";
import {
  router,
  procedure,
  createErrorResponse,
} from "@webstudio-is/trpc-interface/index.server";
import { workspace as workspaceApi } from "@webstudio-is/project/index.server";
import { roles } from "@webstudio-is/trpc-interface/authorize";
import { getPlanInfo, getPaidSeats } from "@webstudio-is/plans/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import env from "~/env/env.server";

const Name = z.string().min(2).max(100);
const Relation = z.enum(roles);

type UpdateSeatsResult =
  | { type: "success"; seats: number }
  | { type: "error"; error: string };

const updateSeats = async ({
  userId,
  subscriptionId,
  newQuantity,
  minSeats,
  maxSeats,
}: {
  userId: string;
  subscriptionId: string;
  newQuantity: number;
  minSeats: number;
  maxSeats: number;
}): Promise<UpdateSeatsResult | null> => {
  if (!env.PAYMENT_WORKER_URL || !env.PAYMENT_WORKER_TOKEN) {
    return null;
  }

  const url = `${env.PAYMENT_WORKER_URL}/seats/update`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PAYMENT_WORKER_TOKEN}`,
    },
    body: JSON.stringify({
      userId,
      subscriptionId,
      newQuantity,
      minSeats,
      maxSeats,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Payment worker /seats/update responded with ${response.status}`
    );
  }

  return (await response.json()) as UpdateSeatsResult;
};

/**
 * Syncs the Stripe seat quantity for the owner of a given workspace.
 * Called after adding or removing members.
 * Throws on payment worker errors so the caller can decide whether to soft-fail.
 *
 * @param countDelta - adjustment to the current member count before syncing.
 *   Pass +1 when a member is about to be added (pre-charge) so that billing
 *   is checked before the DB change is committed.
 */
const syncOwnerSeats = async (
  workspaceId: string,
  ctx: Parameters<typeof workspaceApi.countAllMembers>[1],
  countDelta = 0
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
  const planResults = await getPlanInfo([ownerId], ctx);
  const { planFeatures, purchases } = planResults.get(ownerId) ?? {
    planFeatures: defaultPlanFeatures,
    purchases: [],
  };

  const subscription = purchases.find((p) => p.subscriptionId !== undefined);
  if (subscription?.subscriptionId === undefined) {
    return;
  }

  const memberCount = await workspaceApi.countAllMembers(ownerId, ctx);

  const result = await updateSeats({
    userId: ownerId,
    subscriptionId: subscription.subscriptionId,
    newQuantity: memberCount + countDelta,
    minSeats: planFeatures.minSeats,
    maxSeats: planFeatures.maxSeatsPerWorkspace,
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

        const isDevEnvironment = env.DEPLOYMENT_ENVIRONMENT === "development";
        const hasPaymentWorker =
          env.PAYMENT_WORKER_URL && env.PAYMENT_WORKER_TOKEN;

        if (!hasPaymentWorker && !isDevEnvironment) {
          throw new Error(
            "Adding workspace members requires a configured payment provider."
          );
        }

        const { maxSeatsPerWorkspace } = ctx.planFeatures;
        if (maxSeatsPerWorkspace > 0) {
          const [membersResult, pendingResult] = await Promise.all([
            ctx.postgrest.client
              .from("WorkspaceMember")
              .select("userId", { count: "exact", head: true })
              .eq("workspaceId", input.workspaceId)
              .is("removedAt", null),
            ctx.postgrest.client
              .from("Notification")
              .select("id", { count: "exact", head: true })
              .eq("type", "workspaceInvite")
              .eq("status", "pending")
              .filter("payload->>workspaceId", "eq", input.workspaceId),
          ]);

          if (membersResult.error) {
            throw membersResult.error;
          }
          if (pendingResult.error) {
            throw pendingResult.error;
          }

          const currentCount =
            (membersResult.count ?? 0) + (pendingResult.count ?? 0);
          if (currentCount >= maxSeatsPerWorkspace) {
            throw new Error(
              `This workspace has reached its seat limit of ${maxSeatsPerWorkspace}. Remove a member or upgrade your plan to invite more.`
            );
          }
        }

        // Pre-charge the seat before adding the member (Figma model).
        // We validate user existence first so that a missing account never
        // triggers a billing change.
        // When the payment worker is configured, a billing failure aborts the
        // invite so the member is never added. When the worker URL is not set
        // (self-hosted / dev), syncOwnerSeats returns early and this is a no-op.

        // Validate the invitee exists and is not already a member before
        // touching billing. This mirrors the checks in workspaceApi.addMember
        // so that we never charge for a doomed invite.
        const inviteeResult = await ctx.postgrest.client
          .from("User")
          .select("id")
          .eq("email", input.email)
          .maybeSingle();
        if (inviteeResult.error) {
          throw inviteeResult.error;
        }
        if (inviteeResult.data === null) {
          throw new Error(
            "No Webstudio account found. The user needs to sign up first."
          );
        }
        const existingMemberResult = await ctx.postgrest.client
          .from("WorkspaceMember")
          .select("userId")
          .eq("workspaceId", input.workspaceId)
          .eq("userId", inviteeResult.data.id)
          .is("removedAt", null)
          .maybeSingle();
        if (existingMemberResult.error) {
          throw existingMemberResult.error;
        }
        if (existingMemberResult.data !== null) {
          throw new Error("Already a member of this workspace.");
        }

        try {
          await syncOwnerSeats(input.workspaceId, ctx, +1);
        } catch (error) {
          const technical =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Unable to update billing. Please try again or contact support. (${technical})`
          );
        }

        const { notificationId } = await workspaceApi.addMember(input, ctx);

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
        const paidSeats = await getPaidSeats(members.owner.userId, ctx);
        return {
          success: true as const,
          data: {
            ...members,
            // Falls back to minSeats (seats included in the plan) when no
            // subscription event exists yet (free plan, AppSumo, etc.).
            maxSeats: paidSeats ?? ctx.planFeatures.minSeats,
          },
        };
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
