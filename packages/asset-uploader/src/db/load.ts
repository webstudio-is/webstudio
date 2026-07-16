import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import {
  normalizeAssetFolderData,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import { loadAssetsByProjectWithClient } from "../asset-patch-core";
import { loadAssetFoldersByProjectWithClient } from "../folder-persistence";

type LoadAssetOptions = { skipPermissionsCheck?: boolean };

const assertAssetReadPermission = async (
  projectId: string,
  context: AppContext,
  skipPermissionsCheck: boolean
) => {
  if (
    skipPermissionsCheck === false &&
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    )) === false
  ) {
    throw new AuthorizationError(
      "You don't have access to this project's assets"
    );
  }
};

export const loadAssetsByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: LoadAssetOptions = {}
): Promise<Asset[]> => {
  const { assets } = await loadAssetDataByProject(projectId, context, {
    skipPermissionsCheck,
  });
  return assets;
};

export const loadAssetFoldersByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: LoadAssetOptions = {}
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
  { skipPermissionsCheck = false }: LoadAssetOptions = {}
) => {
  await assertAssetReadPermission(projectId, context, skipPermissionsCheck);
  const [assets, assetFolders] = await Promise.all([
    loadAssetsByProjectWithClient(projectId, context.postgrest.client),
    loadAssetFoldersByProjectWithClient(projectId, context.postgrest.client),
  ]);
  const normalized = normalizeAssetFolderData({
    assets,
    folders: assetFolders,
  });
  return { assets: normalized.assets, assetFolders: normalized.folders };
};
