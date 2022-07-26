import { prisma, Asset } from "@webstudio-is/prisma-client";
import { getAssetPath } from "../helpers/get-asset-path";

export const deleteAsset = async (assetId: Asset["id"]): Promise<Asset> => {
  if (typeof assetId !== "string") {
    throw new Error("Asset ID required");
  }

  const removedAsset = await prisma.asset.delete({ where: { id: assetId } });

  return { ...removedAsset, path: getAssetPath(removedAsset) };
};
