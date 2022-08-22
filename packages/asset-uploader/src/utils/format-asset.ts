import { Asset, DbAsset } from "@webstudio-is/prisma-client";
import { getAssetPath } from "./get-asset-path";

export const formatAsset = (asset: DbAsset): Asset => {
  return {
    ...asset,
    width: Number(asset.width),
    height: Number(asset.height),
    path: getAssetPath(asset),
  };
};
