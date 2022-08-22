import { prisma, Asset } from "@webstudio-is/prisma-client";
import { formatAsset } from "../utils/format-asset";

export const deleteAssetInDb = async (assetId: Asset["id"]) => {
  if (typeof assetId !== "string") {
    throw new Error("Asset ID required");
  }

  const removedAsset = await prisma.asset.delete({ where: { id: assetId } });
  return formatAsset(removedAsset);
};
