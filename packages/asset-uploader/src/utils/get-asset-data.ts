import { z } from "zod";
import { imageSize } from "image-size";
import { FontMeta } from "@webstudio-is/fonts";
import { ImageMeta } from "@webstudio-is/sdk";
import { getFontData } from "./font-data";

export type AssetData = {
  size: number;
  format: string;
  meta: ImageMeta | FontMeta;
};

export const AssetData: z.ZodType<AssetData> = z.object({
  size: z.number(),
  format: z.string(),
  meta: z.union([ImageMeta, FontMeta]),
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
  | ({ type: "font" } & BaseAssetOptions);

export const getAssetData = async (
  options: AssetOptions
): Promise<AssetData> => {
  if (options.type === "image") {
    let image: undefined | { format: string; width: number; height: number };
    try {
      const parsed = imageSize(Buffer.from(options.data));
      if (parsed.type && parsed.width && parsed.height) {
        image = {
          format: parsed.type,
          width: parsed.width,
          height: parsed.height,
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
  const { format, ...meta } = getFontData(options.data, options.name);

  return {
    size: options.size,
    format,
    meta,
  };
};
