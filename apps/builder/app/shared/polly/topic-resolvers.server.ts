import { notification } from "@webstudio-is/project/index.server";
import { db as dashboardDb } from "@webstudio-is/dashboard/index.server";
import { getPlanInfo } from "@webstudio-is/plans/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { publicStaticEnv } from "~/env/env.static";
import type { TopicResolvers, TopicName, SubscriptionResponse } from "./types";

/**
 * Server-side resolver for every topic in the registry.
 *
 * The `TopicResolvers` mapped type guarantees that every key in
 * `TopicRegistry` has a corresponding resolver here. Adding a topic
 * to the registry without implementing it causes a compile error.
 */
const resolvers: TopicResolvers = {
  notifications: (ctx) => {
    if (ctx.authorization.type !== "user") {
      return Promise.resolve([]);
    }
    return notification.list(ctx);
  },
  projectCount: (ctx) => {
    if (ctx.authorization.type !== "user") {
      return Promise.resolve(0);
    }
    return dashboardDb.db.countByUserId({
      userId: ctx.authorization.userId,
      context: ctx,
    });
  },
  seatSuspended: async (ctx) => {
    if (ctx.authorization.type !== "user") {
      return false;
    }
    const userId = ctx.authorization.userId;

    // Find all workspaces where the user is a non-owner active member.
    const memberships = await ctx.postgrest.client
      .from("WorkspaceMember")
      .select("workspaceId, workspace:Workspace!inner(userId, name)")
      .eq("userId", userId)
      .is("removedAt", null);

    if (memberships.error || memberships.data.length === 0) {
      return false;
    }

    // Filter out workspaces owned by the user (shouldn't be any, but be safe).
    const sharedWorkspaces = memberships.data.filter(
      (m) =>
        (m.workspace as unknown as { userId: string; name: string }).userId !==
        userId
    );

    if (sharedWorkspaces.length === 0) {
      return false;
    }

    // Check each workspace owner's plan — suspended if owner of any workspace can't cover seats.
    const ownerIds = sharedWorkspaces.map(
      (m) => (m.workspace as unknown as { userId: string }).userId
    );
    const planResults = await getPlanInfo(ownerIds, ctx);

    for (const m of sharedWorkspaces) {
      const ownerId = (m.workspace as unknown as { userId: string }).userId;
      const features =
        planResults.get(ownerId)?.planFeatures ?? defaultPlanFeatures;

      if (features.maxWorkspaces <= 1) {
        return (m.workspace as unknown as { userId: string; name: string })
          .name;
      }
    }

    return false;
  },
  builderVersion: () => Promise.resolve(publicStaticEnv.VERSION),
};

/**
 * Resolve a subset of topics in parallel.
 *
 * Individual topic failures are silently skipped so one broken
 * resolver doesn't take down the entire response. The client
 * will retry on the next poll cycle.
 */
export const resolveTopics = async (
  topics: readonly TopicName[],
  ctx: Parameters<TopicResolvers[TopicName]>[0]
): Promise<SubscriptionResponse> => {
  const entries = await Promise.all(
    topics.map(async (topic) => {
      try {
        const data = await resolvers[topic](ctx);
        return [topic, data] as const;
      } catch (error) {
        // Log but skip — the client retries on next poll cycle.
        console.error(`[polly] resolver failed for topic "${topic}"`, error);
        return undefined;
      }
    })
  );

  return Object.fromEntries(
    entries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== undefined
    )
  ) as SubscriptionResponse;
};
