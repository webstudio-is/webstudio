import type { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { type FontFormat, FONT_FORMATS } from "@webstudio-is/fonts";
import { FontMeta } from "@webstudio-is/fonts";
import { type Asset, ImageMeta } from "../schema";

export const formatAsset = (asset: DbAsset): Asset => {
  const isFont = FONT_FORMATS.has(asset.format as FontFormat);

  if (isFont) {
    return {
      id: asset.id,
      name: asset.name,
      path: asset.name,
      description: asset.description,
      location: asset.location,
      projectId: asset.projectId,
      size: asset.size,

      type: "font",
      createdAt: asset.createdAt.toISOString(),
      format: asset.format as FontFormat,
      meta: FontMeta.parse(JSON.parse(asset.meta)),
    };
  }

  return {
    id: asset.id,
    name: asset.name,
    path: asset.name,
    description: asset.description,
    location: asset.location,
    projectId: asset.projectId,
    size: asset.size,
    type: "image",
    format: asset.format,
    createdAt: asset.createdAt.toISOString(),
    meta: ImageMeta.parse(JSON.parse(asset.meta)),
  };
};
