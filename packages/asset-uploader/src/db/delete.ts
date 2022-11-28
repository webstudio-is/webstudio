import { prisma } from "@webstudio-is/prisma-client";
import { Asset } from "../schema";

export const deleteFromDb = async (ids: Array<Asset["id"]>) => {
  if (ids.length === 0) {
    throw new Error("Asset IDs required");
  }

  return await prisma.asset.deleteMany({
    where: { id: { in: ids } },
  });
};
