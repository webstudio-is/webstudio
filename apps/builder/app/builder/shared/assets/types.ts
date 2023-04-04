import type { Asset } from "@webstudio-is/asset-uploader";

export type PreviewAsset = Pick<
  Asset,
  "path" | "name" | "id" | "format" | "description" | "type"
>;

export type UploadedAssetContainer = {
  status: "uploaded";
  asset: Asset;
};

export type UploadingAssetContainer = {
  status: "uploading";
  asset: Asset | PreviewAsset;
};

/**
 * Assets that can be shown in the UI
 */
export type AssetContainer = UploadedAssetContainer | UploadingAssetContainer;

export type ActionData = {
  uploadedAssets?: Array<Asset>;
  deletedAssets?: Array<Asset>;
  errors?: string;
};
