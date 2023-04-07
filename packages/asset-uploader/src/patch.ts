import { type Patch, applyPatches } from "immer";
import type { Project } from "@webstudio-is/prisma-client";
import {
  type AppContext,
  authorizeProject,
} from "@webstudio-is/trpc-interface/server";
import { type Asset, Assets } from "./schema";
import { deleteAssets } from "./delete";
import { loadByProject } from "./db/load";
import type { AssetClient } from "./client";

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
    deleteAssets({ projectId, ids: deletedAssetIds }, context, assetClient);
  }
};
