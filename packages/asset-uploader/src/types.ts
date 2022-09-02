import { Asset as DbAsset } from "@webstudio-is/prisma-client";

export type Asset = Omit<DbAsset, "width" | "height"> & {
  path?: string;
  status?: "uploading" | "uploaded";
  width?: number;
  height?: number;
};
