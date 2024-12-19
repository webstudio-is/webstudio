import { type Patch, applyPatches } from "immer";
import {
  type AppContext,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import { type Asset, Assets } from "@webstudio-is/sdk";
import { deleteAssets } from "./delete";
import { loadAssetsByProject } from "./db/load";

/**
 * patchAssets can only delete or add assets
 * update patches are ignored
 */
export const patchAssets = async (
  { projectId }: { projectId: string },
  patches: Array<Patch>,
  context: AppContext
): Promise<void> => {
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
    deleteAssets({ projectId, ids: deletedAssetIds }, context);
  }

  // add new assets found in patched version
  const addedAssets: Asset[] = [];
  for (const [assetId, asset] of patchedAssets) {
    if (assets.has(assetId) === false) {
      addedAssets.push(asset);
    }
  }
  if (addedAssets.length !== 0) {
    const files = await context.postgrest.client
      .from("File")
      .select()
      .in(
        "name",
        addedAssets.map((asset) => asset.name)
      );

    const fileNames = new Set(files.data?.map((file) => file.name));

    // restore file when undo is triggered
    await context.postgrest.client
      .from("File")
      .update({ isDeleted: false })
      .in("name", Array.from(fileNames));

    await context.postgrest.client.from("Asset").insert(
      addedAssets
        // making sure corresponding file exist before creating an asset that references it
        .filter((asset) => fileNames.has(asset.name))
        .map((asset) => ({
          id: asset.id,
          projectId,
          name: asset.name,
        }))
    );
  }
};
