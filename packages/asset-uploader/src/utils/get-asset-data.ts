import { Location } from "@webstudio-is/prisma-client";
import sharp, { type Metadata } from "sharp";

//type FontData = any;

type ImageData = {
  name: string;
  size: number;
  metadata: Metadata;
  location: Location;
};

export type AssetData = ImageData; // | FontData;

type AssetOptions = {
  type: "image" | "font";
  name: string;
  size: number;
  buffer: Buffer | Uint8Array;
  location: Location;
};

export const getAssetData = async (
  options: AssetOptions
): Promise<AssetData> => {
  let metadata;
  if (options.type === "image") {
    const sharpImage = sharp(options.buffer);
    metadata = await sharpImage.metadata();
  }

  if (metadata === undefined) {
    throw new Error("Could not get metadata for asset");
  }

  // @todo fonts
  return {
    name: options.name,
    size: options.size,
    location: options.location,
    metadata,
  };
};
