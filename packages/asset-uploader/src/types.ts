import type { FontFormat } from "@webstudio-is/fonts";
import type { FontMeta } from "@webstudio-is/fonts/server";
import { Asset as DbAsset } from "@webstudio-is/prisma-client";
import type { ImageMeta } from "./utils/format-asset";

type BaseAsset = Omit<DbAsset, "meta"> & {
  path: string;
  status?: "uploading" | "uploaded";
};

export type FontAsset = Omit<BaseAsset, "format"> & {
  format: FontFormat;
  meta: FontMeta;
};

export type ImageAsset = BaseAsset & {
  meta: ImageMeta;
};

export type Asset = FontAsset | ImageAsset;

export type AssetType = "image" | "font";
