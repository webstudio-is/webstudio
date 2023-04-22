import { z } from "zod";
import sharp from "sharp";
import { FontMeta } from "@webstudio-is/fonts";
import { getFontData } from "@webstudio-is/fonts/index.server";
import { Location, ImageMeta } from "../schema";

const BaseData = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  location: Location,
  format: z.string(),
});

const ImageData = BaseData.extend({
  type: z.literal("image"),
  meta: ImageMeta,
});

const FontData = BaseData.extend({
  type: z.literal("font"),
  meta: FontMeta,
});

export const AssetData = z.union([ImageData, FontData]);

export type AssetData = z.infer<typeof AssetData>;

type BaseAssetOptions = {
  id: string;
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
      id: options.id,
      type: options.type,
      format,
      meta: { width, height },
    };
  }

  const { format, ...meta } = getFontData(options.data);

  return {
    id: options.id,
    type: options.type,
    ...baseData,
    format,
    meta,
  };
};
