import { Asset } from "@webstudio-is/asset-uploader";

export type BaseAsset = Pick<
  Asset,
  "id" | "status" | "name" | "path" | "description" | "size" | "meta" | "format"
>;

export type ActionData = {
  uploadedAssets?: Array<Asset>;
  deletedAsset?: Asset;
  errors?: string;
};
