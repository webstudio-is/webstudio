import { Asset } from "@webstudio-is/asset-uploader";

export type PreviewAsset = Pick<
  Asset,
  "path" | "name" | "id" | "status" | "format"
>;

export type ActionData = {
  uploadedAssets?: Array<Asset>;
  deletedAsset?: Asset;
  errors?: string;
};
