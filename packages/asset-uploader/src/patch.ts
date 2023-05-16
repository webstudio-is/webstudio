import { type Patch, applyPatches } from "immer";
import { type Project, prisma } from "@webstudio-is/prisma-client";
import {
  type AppContext,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import { type Asset, Assets } from "./schema";
import { deleteAssets } from "./delete";
import { loadAssetsByProject } from "./db/load";
import type { AssetClient } from "./client";

/**
 * patchAssets can only delete or add assets
 * update patches are ignored
 */
export const patchAssets = async (
  { projectId }: { projectId: Project["id"] },
  patches: Array<Patch>,
  context: AppContext,
  assetClient: AssetClient
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const assetsList = await loadAssetsByProject(projectId, context);
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
    deleteAssets({ projectId, ids: deletedAssetIds }, context, assetClient);
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
  if (addedAssets.length !== 0) {
    const files = await prisma.file.findMany({
      where: { name: { in: addedAssets.map((asset) => asset.name) } },
    });

    const fileNames = new Set(files.map((file) => file.name));

    await prisma.asset.createMany({
      data: addedAssets
        // making sure corresponding file exist before creating an asset that references it
        .filter((asset) => fileNames.has(asset.name))
        .map((asset) => ({
          id: asset.id,
          projectId: asset.projectId,
          name: asset.name,
          // @todo remove once legacy fields are removed from schema
          location: asset.location,
          size: asset.size,
          format: asset.format,
          meta: JSON.stringify(asset.meta),
          status: "UPLOADED",
        })),
    });
  }
};
