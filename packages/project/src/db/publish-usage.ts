import { defaultPlanFeatures, type PlanFeatures } from "@webstudio-is/plans";
import { getExtraPaidSeats } from "@webstudio-is/plans/index.server";
import {
  type AppContext,
  getProjectOwnerId,
  getPlanFeaturesByOwnerId,
} from "@webstudio-is/trpc-interface/index.server";

export const getWorkspaceDailyPublishLimit = (
  plan: PlanFeatures,
  extraSeats: number | null
) => {
  // The base publishing allowance identifies the Free publishing tier,
  // independently of whether the plan includes workspace collaboration.
  if (
    plan.maxDailyPublishesPerUser <=
    defaultPlanFeatures.maxDailyPublishesPerUser
  ) {
    return plan.maxDailyPublishesPerUser;
  }
  return 100 * (1 + plan.seatsIncluded + (extraSeats ?? 0));
};

export const getWorkspacePublishAllowance = async (
  projectId: string,
  context: Pick<AppContext, "postgrest" | "getOwnerPlanFeatures">
) => {
  const ownerId = await getProjectOwnerId(projectId, context);
  const plan = await getPlanFeaturesByOwnerId(ownerId, context);
  const extraSeats =
    plan.maxDailyPublishesPerUser > defaultPlanFeatures.maxDailyPublishesPerUser
      ? await getExtraPaidSeats(ownerId, context)
      : 0;
  return { ownerId, limit: getWorkspaceDailyPublishLimit(plan, extraSeats) };
};

export const getWorkspacePublishUsage = async (
  projectId: string,
  context: Pick<AppContext, "postgrest" | "getOwnerPlanFeatures">
) => {
  const [{ limit }, result] = await Promise.all([
    getWorkspacePublishAllowance(projectId, context),
    context.postgrest.client.rpc("get_workspace_publish_usage", {
      project_id: projectId,
    }),
  ]);
  if (result.error) {
    throw result.error;
  }
  return {
    count: result.data,
    limit,
    remaining: Math.max(0, limit - result.data),
  };
};
