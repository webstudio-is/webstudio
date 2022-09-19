import { useMemo, useState } from "react";
import { useActionData } from "@remix-run/react";
import type { PreviewAsset, ActionData } from "./types";
import {
  type AssetType,
  type Asset,
  filterByType,
} from "@webstudio-is/asset-uploader";
import { useAssets as useAllAssets } from "../nano-states";

export const useAssets = (type: AssetType) => {
  const [allAssets] = useAllAssets();
  const actionData: ActionData | undefined = useActionData();
  const [uploadingAssets, setUploadingAssets] = useState<Array<PreviewAsset>>(
    []
  );

  const assets = useMemo(() => {
    const { errors, uploadedAssets = [], deletedAsset } = actionData ?? {};
    let assets: Array<Asset | PreviewAsset> = [];

    // Once we have uploaded or deleted assets in action data, current upload was finished.
    if (
      uploadedAssets.length === 0 &&
      deletedAsset === undefined &&
      errors === undefined
    ) {
      assets = [...uploadingAssets];
    }

    for (const uploadedAsset of uploadedAssets) {
      const isInAllAssets = allAssets.some(
        (asset) => asset.id === uploadedAsset.id
      );
      if (isInAllAssets === false) {
        assets.unshift(uploadedAsset);
      }
    }

    for (const asset of allAssets) {
      if (asset.id !== deletedAsset?.id) {
        assets.push(asset);
      }
    }

    return filterByType(assets, type);
  }, [actionData, uploadingAssets, type, allAssets]);

  return {
    assets,
    onUploadAsset: setUploadingAssets,
  };
};
