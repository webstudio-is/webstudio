import { DbAsset } from "@webstudio-is/prisma-client";

export type Asset = Omit<DbAsset, "width" | "height"> & {
  path?: string;
  status?: "uploading" | "uploaded";
  width: number | null;
  height: number | null;
};
export type UploadingAsset = Pick<
  Asset,
  "id" | "status" | "name" | "path" | "alt"
>;
