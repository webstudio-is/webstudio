import { useMemo, useState } from "react";
import type { PreviewAsset, ActionData } from "./types";
import {
  type AssetType,
  type Asset,
  filterByType,
} from "@webstudio-is/asset-uploader";
import { useAssets as useAllAssets } from "../nano-states";
import { useSubmit } from "@remix-run/react";

type UseAssetsApi = {
  assets: Array<Asset | PreviewAsset>;
  onSubmitAssets: (assets: Array<PreviewAsset>) => void;
  onActionData: (data: ActionData) => void;
  onDelete: (ids: Array<string>) => void;
};

export const useAssets = (type: AssetType): UseAssetsApi => {
  const submit = useSubmit();
  const [allAssets] = useAllAssets();
  const [actionData, setActionData] = useState<ActionData>({});
  const [uploadingAssets, setUploadingAssets] = useState<Array<PreviewAsset>>(
    []
  );

  const assets = useMemo(() => {
    const {
      errors,
      uploadedAssets = [],
      deletedAssets = [],
    } = actionData ?? {};
    let assets: Array<Asset | PreviewAsset> = [];

    // Once we have uploaded or deleted assets in action data, current upload was finished.
    if (
      uploadedAssets.length === 0 &&
      deletedAssets.length === 0 &&
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
      const isDeleted = deletedAssets.some(
        (deletedAsset) => deletedAsset.id === asset.id
      );
      if (isDeleted === false) {
        assets.push(asset);
      }
    }

    return filterByType(assets, type);
  }, [actionData, uploadingAssets, type, allAssets]);

  const handleDelete = (ids: Array<string>) => {
    const formData = new FormData();
    for (const id of ids) {
      formData.append("assetId", id);
    }
    submit(formData, { method: "delete" });
  };

  return {
    assets,
    onSubmitAssets: setUploadingAssets,
    onActionData: setActionData,
    onDelete: handleDelete,
  };
};
