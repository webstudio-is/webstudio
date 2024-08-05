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
    // use inner to filter out assets without file
    // when file is not uploaded
    .select(
      `
        assetId:id,
        projectId,
        file:File!inner (*)
      `
    )
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED")
    // always sort by primary key to get stable list
    // required to not break fixtures
    .order("id");

  const result: Asset[] = [];
  for (const { assetId, projectId, file } of assets.data ?? []) {
    if (file) {
      result.push(formatAsset({ assetId, projectId, file }));
    }
  }

  return result;
};
