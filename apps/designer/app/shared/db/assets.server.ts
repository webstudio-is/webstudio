import { type Project } from "@webstudio-is/react-sdk";
import { prisma } from "./prisma.server";
import sharp from "sharp";

export const loadByProject = async (projectId?: Project["id"]) => {
  if (typeof projectId !== "string") {
    throw new Error("Tree ID required");
  }

  const assets = await prisma.asset.findMany({
    where: { projectId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return assets;
};

const forceFloat = (number: number) => {
  return parseFloat(number.toFixed(1));
};

export const create = async (
  projectId: Project["id"],
  values: { name: string; path: string; size: number; metadata: sharp.Metadata }
) => {
  const size = values.size || values.metadata.size || 0;
  const { metadata, name, path } = values;
  const newAsset = await prisma.asset.create({
    data: {
      name,
      path,
      size,
      format: metadata.format,
      ...(metadata.width ? { width: forceFloat(metadata.width) } : {}),
      ...(metadata.height ? { height: forceFloat(metadata.height) } : {}),
      projectId,
    },
  });

  return newAsset;
};
