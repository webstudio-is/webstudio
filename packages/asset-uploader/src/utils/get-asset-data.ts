import { z } from "zod";
import sharp from "sharp";
import { FontMeta } from "@webstudio-is/fonts";
import { getFontData } from "@webstudio-is/fonts/index.server";
import { Location, ImageMeta } from "../schema";

export const AssetData = z.object({
  size: z.number(),
  location: Location,
  format: z.string(),
  meta: z.union([ImageMeta, FontMeta]),
});

export type AssetData = z.infer<typeof AssetData>;

type BaseAssetOptions = {
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
      size: options.size,
      location: options.location,
      format,
      meta: { width, height },
    };
  }

  const { format, ...meta } = getFontData(options.data);

  return {
    size: options.size,
    location: options.location,
    format,
    meta,
  };
};
