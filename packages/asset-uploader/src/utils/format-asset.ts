import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { ImageMeta } from "../schema";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";

export const formatAsset = (asset: DbAsset): Asset => {
  const meta = asset.meta ? JSON.parse(asset.meta) : {};
  return {
    ...asset,
    meta: ImageMeta.parse(meta),
    path: getAssetPath(asset),
  };
};
