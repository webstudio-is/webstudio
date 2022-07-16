import { type Project } from "@webstudio-is/react-sdk";
import { prisma } from "./prisma.server";

export const loadByProject = async (projectId?: Project["id"]) => {
  if (typeof projectId !== "string") {
    throw new Error("Tree ID required");
  }

  const assets = await prisma.asset.findMany({
    where: { projectId },
  });

  return assets;
};

export const create = async (
  projectId: Project["id"],
  values: { type: string; name: string; path: string }
) => {
  const newAsset = await prisma.asset.create({
    data: {
      ...values,
      projectId,
    },
  });

  return newAsset;
};
