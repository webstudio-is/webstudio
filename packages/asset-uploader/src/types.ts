import { Asset as DbAsset } from "@webstudio-is/prisma-client";

export type Asset = Omit<DbAsset, "meta"> & {
  path?: string;
  status?: "uploading" | "uploaded";
  meta: {
    width?: number;
    height?: number;
  };
};
