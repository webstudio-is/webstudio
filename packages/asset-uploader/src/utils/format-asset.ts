import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";

export const formatAsset = (asset: DbAsset): Asset => {
  return {
    ...asset,
    width: asset.width ? Number(asset.width) : undefined,
    height: asset.height ? Number(asset.height) : undefined,
    path: getAssetPath(asset),
  };
};
