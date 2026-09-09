import { defaultPlanFeatures } from "@webstudio-is/plans";
import { getExtraPaidSeats } from "@webstudio-is/plans/index.server";
import {
  type AppContext,
  getPlanFeaturesByOwnerId,
} from "@webstudio-is/trpc-interface/index.server";

export const getWorkspacePublishUsage = async (
  projectId: string,
  context: AppContext
) => {
  const project = await context.postgrest.client
    .from("Project")
    .select("workspaceId, userId")
    .eq("id", projectId)
    .eq("isDeleted", false)
    .single();
  if (project.error) {
    throw project.error;
  }
  const { workspaceId, userId } = project.data;
  if (userId === null) {
    throw new Error("Project must have project userId defined");
  }
  const plan = await getPlanFeaturesByOwnerId(userId, context);
  let limit = plan.maxDailyPublishesPerUser;
  if (limit > defaultPlanFeatures.maxDailyPublishesPerUser) {
    const extraSeats = await getExtraPaidSeats(userId, context);
    limit *= 1 + plan.seatsIncluded + (extraSeats ?? 0);
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const result = await context.postgrest.client
    .from("Build")
    .select("id, Project!inner(workspaceId, userId)", {
      count: "exact",
      head: true,
    })
    .eq(
      workspaceId === null ? "Project.userId" : "Project.workspaceId",
      workspaceId ?? userId
    )
    .not("deployment", "is", null)
    .gte("createdAt", today.toISOString());
  if (result.error) {
    throw result.error;
  }
  return { count: result.count ?? 0, limit };
};
