import { z } from "zod";
import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { type FontFormat, FONT_FORMATS } from "@webstudio-is/fonts";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";
import { styles } from "./get-font-data";

const ImageMeta = z.object({
  width: z.number(),
  height: z.number(),
});
export type ImageMeta = z.infer<typeof ImageMeta>;

export const FontMeta = z.object({
  family: z.string(),
  style: z.enum(styles),
  weight: z.number(),
});
export type FontMeta = z.infer<typeof FontMeta>;

export const formatAsset = (asset: DbAsset): Asset => {
  const base = { ...asset, path: getAssetPath(asset) };

  const isFont = asset.format in FONT_FORMATS;

  if (isFont) {
    return {
      ...base,
      format: asset.format as FontFormat,
      meta: FontMeta.parse(JSON.parse(asset.meta)),
    };
  }

  return {
    ...base,
    meta: ImageMeta.parse(JSON.parse(asset.meta)),
  };
};
