import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import type { FontMeta, ImageMeta } from "./utils/format-asset";

export type Asset = Omit<DbAsset, "meta"> & {
  path?: string;
  status?: "uploading" | "uploaded";
  meta: ImageMeta | FontMeta;
};

export type AssetType = "image" | "font";
