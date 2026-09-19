import { z } from "zod";
import { imageMeta as parseImageMeta } from "image-meta";
import {
  FONT_FORMATS,
  type FontFormat,
  type FontMeta,
  fontMeta,
} from "@webstudio-is/fonts";
import {
  type AssetType,
  type ImageMeta,
  imageMeta,
  mergeAssetMeta,
  validateFileName,
} from "@webstudio-is/sdk";
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
  const type: AssetType =
    "family" in detected.meta
      ? "font"
      : "width" in detected.meta && "height" in detected.meta
        ? "image"
        : "file";
  const meta = mergeAssetMeta(type, detected.meta, override?.meta ?? {});
  if (meta === undefined) {
    throw new Error("Asset metadata override is invalid");
  }
  const format =
    type === "font" ? detected.format : (override?.format ?? detected.format);
  if (type !== "font" && FONT_FORMATS.has(format as FontFormat)) {
    throw new Error("Font format requires valid font metadata");
  }

  return {
    ...detected,
    format,
    meta,
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

  // The persisted asset type is derived from its detected format. Parse font
  // extensions as fonts even when a caller labels the upload as a generic file,
  // otherwise the upload could persist `{}` metadata that cannot be loaded as a
  // font later.
  const { extension } = validateFileName(options.name);
  if (FONT_FORMATS.has(extension as FontFormat)) {
    const { format, ...meta } = getFontData(options.data, options.name);
    return {
      size: options.size,
      format,
      meta,
    };
  }

  return {
    size: options.size,
    format: extension,
    meta: {},
  };
};
