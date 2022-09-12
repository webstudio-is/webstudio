import { prisma } from "@webstudio-is/prisma-client";
import { deleteFromDb } from "./db";
import { Asset } from "./types";
import { deleteFromFs } from "./targets/fs/delete";
import { deleteFromS3 } from "./targets/s3/delete";

export const deleteAsset = async ({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<Asset> => {
  const currentAsset = await prisma.asset.findUnique({
    where: { id },
  });
  if (!currentAsset) throw new Error("Asset does not exist");

  if (currentAsset.location === "REMOTE") {
    await deleteFromS3(name);
  } else {
    await deleteFromFs(name);
  }

  return await deleteFromDb(id);
};
