import { z } from "zod";
import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";
import { FONT_FORMATS } from "../constants";
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
  const Schema = FONT_FORMATS.includes(
    asset.format as typeof FONT_FORMATS[number]
  )
    ? FontMeta
    : ImageMeta;
  const meta = Schema.parse(JSON.parse(asset.meta));
  return {
    ...asset,
    meta,
    path: getAssetPath(asset),
  };
};
