import { prisma } from "@webstudio-is/prisma-client";
import { deleteFromDb } from "./db";
import { Asset } from "./schema";
import { deleteFromFs } from "./targets/fs/delete";
import { deleteFromS3 } from "./targets/s3/delete";
import { formatAsset } from "./utils/format-asset";

export const deleteAssets = async (
  ids: Array<string>
): Promise<Array<Asset>> => {
  const assets = await prisma.asset.findMany({
    where: { id: { in: ids } },
  });
  if (assets.length === 0) {
    throw new Error("Assets not found");
  }

  await deleteFromDb(ids);

  for (const asset of assets) {
    if (asset.location === "REMOTE") {
      await deleteFromS3(asset.name);
    } else {
      await deleteFromFs(asset.name);
    }
  }

  return assets.map(formatAsset);
};
