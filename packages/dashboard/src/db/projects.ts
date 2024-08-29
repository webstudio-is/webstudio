import type { SetNonNullable } from "type-fest";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { DashboardProjects } from "./schema";

export const findMany = async (userId: string, context: AppContext) => {
  if (userId !== context.authorization.userId) {
    throw new AuthorizationError(
      "Only the project owner can view the project list"
    );
  }

  const data = await context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*)")
    .eq("userId", userId)
    .eq("isDeleted", false)
    .order("createdAt", { ascending: false })
    .order("id", { ascending: false });
  if (data.error) {
    throw data.error;
  }
  return data.data as SetNonNullable<
    (typeof data.data)[number]
  >[] satisfies DashboardProjects;
};

export const findManyByIds = async (
  projectIds: string[],
  context: AppContext
) => {
  if (projectIds.length === 0) {
    return [];
  }
  const data = await context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*)")
    .in("id", projectIds)
    .eq("isDeleted", false)
    .order("createdAt", { ascending: false })
    .order("id", { ascending: false });
  if (data.error) {
    throw data.error;
  }
  return data.data as SetNonNullable<
    (typeof data.data)[number]
  >[] satisfies DashboardProjects;
};
