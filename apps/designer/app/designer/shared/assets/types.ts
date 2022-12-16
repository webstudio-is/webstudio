import { Asset } from "@webstudio-is/asset-uploader";

type PreviewAsset = Pick<
  Asset,
  "path" | "name" | "id" | "format" | "description"
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
 * Used for optimistic UI only
 **/
export type DeletingAssetContainer = {
  status: "deleting";
  asset: Asset;
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
