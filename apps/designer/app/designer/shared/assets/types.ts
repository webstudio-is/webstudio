import { Asset } from "@webstudio-is/asset-uploader";

export type PreviewAsset = Pick<Asset, "path" | "name" | "id" | "format"> & {
  status: "uploading";
  formData: FormData;
};

export type DeletingAsset = (
  | Omit<PreviewAsset, "status">
  | Omit<Asset, "status">
) & {
  status: "deleting";
};

export type ActionData = {
  uploadedAssets?: Array<Asset>;
  deletedAssets?: Array<Asset>;
  errors?: string;
};
