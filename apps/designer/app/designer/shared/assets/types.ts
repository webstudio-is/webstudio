import { Asset } from "@webstudio-is/asset-uploader";

export type PreviewAsset = Pick<Asset, "path" | "name" | "id" | "format"> & {
  status: "uploading";
};

export type DeletingAsset = Omit<Asset, "status"> & {
  status: "deleting";
};

export type ActionData = {
  uploadedAssets?: Array<Asset>;
  deletedAssets?: Array<Asset>;
  errors?: string;
};
