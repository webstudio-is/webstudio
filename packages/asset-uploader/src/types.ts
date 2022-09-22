import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import type { FontMeta, ImageMeta } from "./utils/format-asset";

type BaseAsset = Omit<DbAsset, "meta"> & {
  path: string;
  status?: "uploading" | "uploaded";
};

export type FontAsset = BaseAsset & {
  meta: FontMeta;
};

export type ImageAsset = BaseAsset & {
  meta: ImageMeta;
};

export type Asset = FontAsset | ImageAsset;

export type AssetType = "image" | "font";
