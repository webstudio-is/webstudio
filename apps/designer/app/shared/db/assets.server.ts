import { type Project } from "@webstudio-is/react-sdk";
import { prisma } from "./prisma.server";
import sharp from "sharp";
import fsPromises from "fs/promises";
import { fetch } from "@remix-run/node";

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

  // if there is no absolute path then it means it's a remote image and we can use fetch
  if (absolutePath) {
    size = await (await fsPromises.stat(absolutePath)).size;
  } else {
    const arrayBuffer = await fetch(values.path).then((rsp) =>
      rsp.arrayBuffer()
    );
    size = arrayBuffer.byteLength;
  }

  const newAsset = await prisma.asset.create({
    data: {
      ...values,
      size,
      format: metadata.format,
      ...(metadata.width ? { width: Math.round(metadata.width) } : {}),
      ...(metadata.height ? { height: Math.round(metadata.height) } : {}),
      projectId,
    },
  });

  return newAsset;
};
