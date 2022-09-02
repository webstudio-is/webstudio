import { Asset } from "@webstudio-is/asset-uploader";

export type BaseAsset = Pick<
  Asset,
  "id" | "status" | "name" | "path" | "alt" | "size" | "width" | "height"
>;
