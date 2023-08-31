import type { Asset } from "@webstudio-is/sdk";

type PreviewAsset = Pick<
  Asset,
  "name" | "id" | "format" | "description" | "type"
>;

export type UploadedAssetContainer = {
  status: "uploaded";
  asset: Asset;
};

export type UploadingAssetContainer = {
  status: "uploading";
  objectURL: string;
  asset: PreviewAsset;
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
