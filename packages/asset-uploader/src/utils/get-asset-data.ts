import { z } from "zod";
import { imageMeta } from "image-meta";
import { FontMeta } from "@webstudio-is/fonts";
import { ImageMeta, validateFileName } from "@webstudio-is/sdk";
import { getFontData } from "./font-data";

export type AssetData = {
  size: number;
  format: string;
  meta: ImageMeta | FontMeta | object;
};

export const AssetData: z.ZodType<AssetData> = z.object({
  size: z.number(),
  format: z.string(),
  meta: z.union([ImageMeta, FontMeta, z.object({})]),
});

type BaseAssetOptions = {
  size: number;
  data: Uint8Array;
  name: string;
};

type AssetOptions =
  | ({
      type: "image";
    } & BaseAssetOptions)
  | ({ type: "font" } & BaseAssetOptions)
  | ({ type: "file" } & BaseAssetOptions);

export const getAssetData = async (
  options: AssetOptions
): Promise<AssetData> => {
  if (options.type === "image") {
    let image: undefined | { format: string; width: number; height: number };
    try {
      const parsed = imageMeta(Buffer.from(options.data));
      if (parsed.type) {
        image = {
          format: parsed.type,
          // SVG images may not have explicit width/height dimensions
          // (they use viewBox instead), so we default to 0 if missing
          width: parsed.width ?? 0,
          height: parsed.height ?? 0,
        };
      }
    } catch {
      // empty block
    }
    if (image === undefined) {
      throw new Error("Unknown image format");
    }

    const { format, width, height } = image;
    return {
      size: options.size,
      format,
      meta: { width, height },
    };
  }

  if (options.type === "font") {
    const { format, ...meta } = getFontData(options.data, options.name);

    return {
      size: options.size,
      format,
      meta,
    };
  }

  // Validate file name and get extension
  const { extension } = validateFileName(options.name);

  return {
    size: options.size,
    format: extension,
    meta: {},
  };
};
