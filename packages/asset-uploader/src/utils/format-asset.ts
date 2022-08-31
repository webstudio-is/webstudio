import { DbAsset } from "@webstudio-is/prisma-client";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";

export const formatAsset = (asset: DbAsset): Asset => {
  return {
    ...asset,
    width: Number(asset.width),
    height: Number(asset.height),
    path: getAssetPath(asset),
  };
};
