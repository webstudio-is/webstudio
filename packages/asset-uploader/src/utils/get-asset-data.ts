import { Location } from "@webstudio-is/prisma-client";
import sharp, { type Metadata } from "sharp";

type BaseData = {
  name: string;
  size: number;
  location: Location;
};

type ImageData = BaseData & {
  type: "image";
  metadata: Metadata;
};

type FontData = BaseData & {
  type: "font";
  // @todo fonts meta
  metadata: {};
};

export type AssetData = ImageData | FontData;

type BaseAssetOptions = {
  name: string;
  size: number;
  buffer: Buffer | Uint8Array;
  location: Location;
};

type AssetOptions =
  | ({
      type: "image";
    } & BaseAssetOptions)
  | ({ type: "font" } & BaseAssetOptions);

export const getAssetData = async (
  options: AssetOptions
): Promise<AssetData> => {
  let metadata;
  if (options.type === "image") {
    const sharpImage = sharp(options.buffer);
    metadata = await sharpImage.metadata();
  } else {
    metadata = {};
  }

  if (metadata === undefined) {
    throw new Error("Could not get metadata for asset");
  }

  // @todo fonts
  return {
    type: options.type,
    name: options.name,
    size: options.size,
    location: options.location,
    metadata,
  };
};
