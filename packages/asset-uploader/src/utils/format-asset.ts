import { z } from "zod";
import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { type FontFormat, FONT_FORMATS } from "@webstudio-is/fonts";
import { FontMeta } from "@webstudio-is/fonts/server";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";

const ImageMeta = z.object({
  width: z.number(),
  height: z.number(),
});
export type ImageMeta = z.infer<typeof ImageMeta>;

export const formatAsset = (asset: DbAsset): Asset => {
  const base = { ...asset, path: getAssetPath(asset) };

  const isFont = FONT_FORMATS.has(asset.format as FontFormat);

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
