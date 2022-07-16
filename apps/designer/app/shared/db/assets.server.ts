import { type Project } from "@webstudio-is/react-sdk";
import { prisma } from "./prisma.server";
import sharp from "sharp";
import fs from "fs";

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
  values: { name: string; path: string },
  absolutePath?: string
) => {
  let size = 0;
  const image = await sharp(absolutePath);
  const metadata = await image.metadata();
  if (absolutePath) {
    size = fs.statSync(absolutePath).size;
  }

  const newAsset = await prisma.asset.create({
    data: {
      ...values,
      size,
      format: metadata.format,
      width: Math.round(metadata.width),
      height: Math.round(metadata.height),
      projectId,
    },
  });

  return newAsset;
};
