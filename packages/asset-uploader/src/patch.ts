import { type Patch, applyPatches } from "immer";
import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  type AppContext,
  authorizeProject,
} from "@webstudio-is/trpc-interface/server";
import { type Asset, Assets, Env } from "./schema";
import { deleteAssets } from "./delete";
import { loadByProject } from "./db/load";

const env = Env.parse(process.env);
const MAX_ASSETS_PER_PROJECT = env.MAX_ASSETS_PER_PROJECT;

const truncateNewAssets = (assetsCount: number, newAssets: Asset[]) => {
  const possibleNewAssetsCount = Math.max(
    0,
    MAX_ASSETS_PER_PROJECT - assetsCount
  );
  return newAssets.slice(0, possibleNewAssetsCount);
};

/**
 * patchAssets can only delete or add assets
 * update patches are ignored
 */
export const patchAssets = async (
  { projectId }: { projectId: Project["id"] },
  patches: Array<Patch>,
  context: AppContext
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const assetsList = await loadByProject(projectId, context);
  const assets = new Map<Asset["id"], Asset>();
  for (const asset of assetsList) {
    assets.set(asset.id, asset);
  }
  const patchedAssets = Assets.parse(applyPatches(assets, patches));

  // delete assets no longer existing in patched version
  const deletedAssetIds: Asset["id"][] = [];
  for (const assetId of assets.keys()) {
    if (patchedAssets.has(assetId) === false) {
      deletedAssetIds.push(assetId);
    }
  }
  if (deletedAssetIds.length !== 0) {
    deleteAssets({ projectId, ids: deletedAssetIds }, context);
  }

  // add new assets found in patched version
  const addedAssets: Asset[] = [];
  for (const [assetId, asset] of patchedAssets) {
    // skip stubbed assets
    if (asset === undefined) {
      continue;
    }
    if (assets.has(assetId) === false) {
      addedAssets.push(asset);
    }
  }
  const truncatedAddedAssets = truncateNewAssets(assets.size, addedAssets);
  if (truncatedAddedAssets.length !== 0) {
    await prisma.asset.createMany({
      data: truncatedAddedAssets.map((asset) => ({
        id: asset.id,
        location: asset.location,
        name: asset.name,
        size: asset.size,
        format: asset.format,
        projectId: asset.projectId,
        meta: JSON.stringify(asset.meta),
        status: "UPLOADED",
      })),
    });
  }
};
