import type { AssetFolder } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { loadAssetsByProjectWithClient } from "./asset-patch-core";
import { loadAssetFoldersByProjectWithClient } from "./folder-persistence";
import { assertAssetReadPermission } from "./read-permission";

export const loadAssetFoldersByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: { skipPermissionsCheck?: boolean } = {}
): Promise<AssetFolder[]> => {
  await assertAssetReadPermission(projectId, context, skipPermissionsCheck);
  return loadAssetFoldersByProjectWithClient(
    projectId,
    context.postgrest.client
  );
};

export const loadAssetDataByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: { skipPermissionsCheck?: boolean } = {}
) => {
  await assertAssetReadPermission(projectId, context, skipPermissionsCheck);
  const [assets, assetFolders] = await Promise.all([
    loadAssetsByProjectWithClient(projectId, context.postgrest.client),
    loadAssetFoldersByProjectWithClient(projectId, context.postgrest.client),
  ]);
  return { assets, assetFolders };
};
