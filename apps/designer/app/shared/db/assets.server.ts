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
  return parseFloat(Number(number).toFixed(1));
};

export const create = async (
  projectId: Project["id"],
  values: { name: string; path: string; size: number; arrayBuffer: ArrayBuffer }
) => {
  // there is an issue in the @types/sharp, it also accepts array buffers
  const image = sharp(values.arrayBuffer as Uint8Array);
  const metadata = await image.metadata();
  const newAsset = await prisma.asset.create({
    data: {
      name: values.name,
      path: values.path,
      size: values.size,
      format: metadata.format,
      ...(metadata.width ? { width: forceFloat(metadata.width) } : {}),
      ...(metadata.height ? { height: forceFloat(metadata.height) } : {}),
      projectId,
    },
  });

  return newAsset;
};
