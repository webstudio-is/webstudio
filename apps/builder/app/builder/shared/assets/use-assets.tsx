import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import type { Asset, Assets } from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import {
  $uploadingFilesDataStore,
  type UploadingFileData,
} from "~/shared/nano-states";
import type {
  AssetContainer,
  UploadedAssetContainer,
  UploadingAssetContainer,
} from "./types";
import { uploadingFileDataToAsset } from "./asset-utils";

const getAssetContainers = (
  assets: Assets,
  uploadingFilesData: UploadingFileData[]
) => {
  const uploadingContainers: UploadingAssetContainer[] = [];

  for (const uploadingFile of uploadingFilesData) {
    uploadingContainers.push({
      status: "uploading",
      objectURL: uploadingFile.objectURL,
      asset: uploadingFileDataToAsset(uploadingFile),
    });
  }

  const uploadedContainers: UploadedAssetContainer[] = [];

  for (const asset of assets.values()) {
    uploadedContainers.push({
      status: "uploaded",
      asset,
    });
  }

  // sort newest uploaded assets first
  uploadedContainers.sort(
    (leftContainer, rightContainer) =>
      new Date(rightContainer.asset.createdAt).getTime() -
      new Date(leftContainer.asset.createdAt).getTime()
  );

  // put uploading assets first
  return [...uploadingContainers, ...uploadedContainers];
};

const filterByType = (
  assetContainers: AssetContainer[],
  type: Asset["type"] | undefined
) => {
  if (type === undefined) {
    return assetContainers;
  }
  return assetContainers.filter((assetContainer) => {
    return assetContainer.asset.type === type;
  });
};

export const useAssets = (type?: Asset["type"]) => {
  const assets = useStore($assets);
  const uploadingFilesData = useStore($uploadingFilesDataStore);
  const assetContainers = useMemo(
    () => getAssetContainers(assets, uploadingFilesData),
    [assets, uploadingFilesData]
  );

  const assetsByType = useMemo(() => {
    return filterByType(assetContainers, type);
  }, [assetContainers, type]);

  return {
    /**
     * Already loaded assets or assets that are being uploaded
     */
    assetContainers: assetsByType,
  };
};

export const __testing__ = {
  filterByType,
};
