import type { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { type FontFormat, FONT_FORMATS } from "@webstudio-is/fonts";
import { FontMeta } from "@webstudio-is/fonts";
import { getAssetPath } from "./get-asset-path";
import { type Asset, ImageMeta } from "../schema";

export const formatAsset = (asset: DbAsset): Asset => {
  const base = { ...asset, path: getAssetPath(asset) };

  const isFont = FONT_FORMATS.has(asset.format as FontFormat);

  if (isFont) {
    return {
      ...base,
      type: "font",
      createdAt: base.createdAt.toISOString(),
      format: asset.format as FontFormat,
      meta: FontMeta.parse(JSON.parse(asset.meta)),
    };
  }

  return {
    ...base,
    type: "image",
    createdAt: base.createdAt.toISOString(),
    meta: ImageMeta.parse(JSON.parse(asset.meta)),
  };
};
