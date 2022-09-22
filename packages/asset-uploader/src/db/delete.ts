import { prisma } from "@webstudio-is/prisma-client";
import { Asset } from "../types";
import { formatAsset } from "../utils/format-asset";

export const deleteFromDb = async (assetId: Asset["id"]) => {
  if (typeof assetId !== "string") {
    throw new Error("Asset ID required");
  }

  const removedAsset = await prisma.asset.delete({ where: { id: assetId } });
  return formatAsset(removedAsset);
};
