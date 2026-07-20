import { z } from "zod";
import { imageMeta as parseImageMeta } from "image-meta";
import { type FontMeta, fontMeta } from "@webstudio-is/fonts";
import { type ImageMeta, imageMeta, validateFileName } from "@webstudio-is/sdk";
import { getFontData } from "./font-data";

export type AssetData = {
  size: number;
  format: string;
  meta: ImageMeta | FontMeta | object;
};

export const assetData: z.ZodType<AssetData> = z.object({
  size: z.number(),
  format: z.string(),
  meta: z.union([imageMeta, fontMeta, z.object({})]),
});

export const assetDataOverride = z.object({
  format: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type AssetDataOverride = z.infer<typeof assetDataOverride>;

export const applyAssetDataOverride = (
  detected: AssetData,
  override?: AssetDataOverride
): AssetData => {
  const meta = { ...detected.meta, ...override?.meta };
  const parsedMeta =
    "family" in detected.meta
      ? fontMeta.parse(meta)
      : "width" in detected.meta && "height" in detected.meta
        ? imageMeta.parse(meta)
        : z.object({}).parse(meta);

  return {
    ...detected,
    format: override?.format ?? detected.format,
    meta: parsedMeta,
  };
};

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
      const parsed = parseImageMeta(Buffer.from(options.data));
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
