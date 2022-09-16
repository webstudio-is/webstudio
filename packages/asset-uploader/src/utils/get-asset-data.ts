import { Location } from "@webstudio-is/prisma-client";
import sharp from "sharp";
import type { FontMeta, ImageMeta } from "./format-asset";

type BaseData = {
  name: string;
  size: number;
  location: Location;
  format: string;
};

type ImageData = BaseData & {
  type: "image";
  meta: ImageMeta;
};

type FontData = BaseData & {
  type: "font";
  // @todo fonts meta
  meta: FontMeta;
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
  const baseData = {
    name: options.name,
    size: options.size,
    location: options.location,
  };
  if (options.type === "image") {
    const sharpImage = sharp(options.buffer);
    const { width, height, format } = await sharpImage.metadata();
    if (format === undefined) {
      throw new Error("Unknown image format");
    }
    if (width === undefined || height === undefined) {
      throw new Error("Unknown image dimensions");
    }

    return {
      ...baseData,
      type: options.type,
      format,
      meta: { width, height },
    };
  }
  // @todo meta for fonts
  return { type: options.type, ...baseData, format: "ttf", meta: {} };
};
