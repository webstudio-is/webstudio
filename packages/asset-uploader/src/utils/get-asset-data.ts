import { Location } from "@webstudio-is/prisma-client";
import sharp from "sharp";
import { FontMeta, ImageMeta } from "./format-asset";
import { getFontData } from "./get-font-data";

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
  meta: FontMeta;
};

export type AssetData = ImageData | FontData;

type BaseAssetOptions = {
  name: string;
  size: number;
  data: Uint8Array;
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
    const sharpImage = sharp(options.data);
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

  const { format, ...meta } = getFontData(options.data);

  return {
    type: options.type,
    ...baseData,
    format,
    meta,
  };
};
