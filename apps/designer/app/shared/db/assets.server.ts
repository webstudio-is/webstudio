import { type Project } from "@webstudio-is/react-sdk";
import { prisma } from "./prisma.server";
import sharp from "sharp";

export const loadByProject = async (projectId?: Project["id"]) => {
  if (typeof projectId !== "string") {
    throw new Error("Tree ID required");
  }

  const assets = await prisma.asset.findMany({
    where: { projectId },
  });

  return assets;
};

const createAssetInDb = async (
  projectId: Project["id"],
  values: {
    name: string;
    path: string;
    size: number;
    metadata: sharp.Metadata;
  }
) => {
  const size = values.size || values.metadata.size || 0;
  const { metadata, name, path } = values;
  const newAsset = await prisma.asset.create({
    data: {
      name,
      path,
      size,
      format: metadata.format,
      ...(metadata.width ? { width: Math.round(metadata.width) } : {}),
      ...(metadata.height ? { height: Math.round(metadata.height) } : {}),
      projectId,
    },
  });
  return newAsset;
};

export const create = async (
  projectId: Project["id"],
  values: { name: string; path: string; size: number; arrayBuffer: ArrayBuffer }
) => {
  // there is an issue in the @types/sharp, it also accepts array buffers
  const image = sharp(values.arrayBuffer as Uint8Array);

  const metadata = await image.metadata();
  const newAsset = await createAssetInDb(projectId, {
    name: values.name,
    path: values.path,
    size: values.size,
    metadata,
  });

  return newAsset;
};

export const createFromS3 = async (
  projectId: Project["id"],
  values: { name: string; path: string; size: number; metadata: sharp.Metadata }
) => {
  const newAsset = await createAssetInDb(projectId, {
    ...values,
  });

  return newAsset;
};
