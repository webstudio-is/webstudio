import { Asset as DbAsset } from "@webstudio-is/prisma-client";

type ImageMeta = {
  width?: number;
  height?: number;
};

export type Asset = Omit<DbAsset, "meta"> & {
  path?: string;
  status?: "uploading" | "uploaded";
  meta: ImageMeta;
};
