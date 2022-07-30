import { Asset as BaseAsset } from "@webstudio-is/prisma-client";
import { panels } from "./panels";

export type TabName = keyof typeof panels | "none";

export type UploadingAsset = Pick<
  BaseAsset,
  "id" | "status" | "name" | "path" | "alt"
>;
export type Asset = BaseAsset | UploadingAsset;
