import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { formatAsset } from "../utils/format-asset";

export const loadAssetsByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: { skipPermissionsCheck?: boolean } = {}
): Promise<Asset[]> => {
  const canRead =
    skipPermissionsCheck ||
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    ));

  if (canRead === false) {
    throw new AuthorizationError(
      "You don't have access to this project assets"
    );
  }

  const assets = await context.postgrest.client
    .from("Asset")
    .select(
      `
        assetId:id,
        projectId,
        file:File!inner (*)
      `
    )
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED");

  const result: Asset[] = [];
  for (const { assetId, projectId, file } of assets.data ?? []) {
    if (file) {
      result.push(formatAsset({ assetId, projectId, file }));
    }
  }

  // order by createdAt desc
  result.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return result;
};
