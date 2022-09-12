import { z } from "zod";
import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import { Asset } from "../types";
import { getAssetPath } from "./get-asset-path";

// @todo to use to distinguish between images and fonts
//const formatTypeMap = {
//  woff: "font",
//  woff2: "font",
//  ttf: "font",
//  otf: "font",
//  eot: "font",
//} as const;

const ImageMeta = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});

export const formatAsset = (asset: DbAsset): Asset => {
  const meta = ImageMeta.parse(JSON.parse(asset.meta));
  return {
    ...asset,
    meta,
    path: getAssetPath(asset),
  };
};
