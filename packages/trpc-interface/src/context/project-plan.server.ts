import type { PlanFeatures } from "@webstudio-is/plans";
import type { AppContext } from "./context.server";

type ProjectOwnerContext = Pick<AppContext, "postgrest">;
type ProjectPlanContext = Pick<
  AppContext,
  "postgrest" | "getOwnerPlanFeatures"
>;
type OwnerPlanContext = Pick<AppContext, "getOwnerPlanFeatures">;

const projectOwnerIdCache = new WeakMap<object, Map<string, Promise<string>>>();
const ownerPlanFeaturesCache = new WeakMap<
  object,
  Map<string, Promise<PlanFeatures>>
>();

const getCachedProjectOwnerId = (
  context: ProjectOwnerContext,
  projectId: string
) => {
  let cache = projectOwnerIdCache.get(context);
  if (cache === undefined) {
    cache = new Map();
    projectOwnerIdCache.set(context, cache);
  }

  let promise = cache.get(projectId);
  if (promise !== undefined) {
    return promise;
  }

  promise = (async () => {
    const projectResult = await context.postgrest.client
      .from("Project")
      .select("userId")
      .eq("id", projectId)
      .eq("isDeleted", false)
      .single();

    if (projectResult.error) {
      throw projectResult.error;
    }

    if (projectResult.data.userId === null) {
      throw new Error("Project must have project userId defined");
    }

    return projectResult.data.userId;
  })();

  promise.catch(() => {
    if (cache.get(projectId) === promise) {
      cache.delete(projectId);
    }
  });
  cache.set(projectId, promise);
  return promise;
};

export const getProjectOwnerId = async (
  projectId: string,
  context: ProjectOwnerContext
): Promise<string> => {
  return await getCachedProjectOwnerId(context, projectId);
};

export const getPlanFeaturesByOwnerId = async (
  ownerId: string,
  context: OwnerPlanContext
): Promise<PlanFeatures> => {
  let cache = ownerPlanFeaturesCache.get(context);
  if (cache === undefined) {
    cache = new Map();
    ownerPlanFeaturesCache.set(context, cache);
  }

  let promise = cache.get(ownerId);
  if (promise !== undefined) {
    return await promise;
  }

  promise = context.getOwnerPlanFeatures(ownerId);

  promise.catch(() => {
    if (cache.get(ownerId) === promise) {
      cache.delete(ownerId);
    }
  });
  cache.set(ownerId, promise);
  return await promise;
};

export const getProjectPlanFeatures = async (
  projectId: string,
  context: ProjectPlanContext
): Promise<PlanFeatures> => {
  const ownerId = await getProjectOwnerId(projectId, context);
  return await getPlanFeaturesByOwnerId(ownerId, context);
};
