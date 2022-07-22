import { prisma, Project } from "@webstudio-is/prisma-client";
import { AssetWithPath } from "../schema";
import { getAssetPath } from "../helpers/get-asset-path";

export const loadByProject = async (
  projectId?: Project["id"]
): Promise<AssetWithPath[]> => {
  if (typeof projectId !== "string") {
    throw new Error("Tree ID required");
  }

  const assets = await prisma.asset.findMany({
    where: { projectId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return assets.map((asset) => ({
    ...asset,
    path: getAssetPath(asset),
  }));
};
