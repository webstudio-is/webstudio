import { prisma, Project, Asset } from "@webstudio-is/prisma-client";
import { getAssetPath } from "../helpers/get-asset-path";

export const loadByProject = async (
  projectId?: Project["id"]
): Promise<Asset[]> => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
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
