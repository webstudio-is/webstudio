import { useEffect, useState } from "react";
import { useActionData } from "@remix-run/react";
import type { BaseAsset, ActionData } from "./types";
import { type AssetType, filterByType } from "@webstudio-is/asset-uploader";

export const useAssets = (
  initialAssets: Array<BaseAsset> = [],
  type: AssetType
) => {
  const actionData: ActionData | undefined = useActionData();
  const [assets, setAssets] = useState<BaseAsset[]>(initialAssets);

  useEffect(() => {
    const { errors, uploadedAssets, deletedAsset } = actionData ?? {};
    if (errors) {
      setAssets((currentAssets) =>
        currentAssets.filter((asset) => asset.status !== "uploading")
      );
    }
    if (uploadedAssets?.length) {
      setAssets((currentAssets) => [
        ...uploadedAssets.filter((uploadedAsset) =>
          currentAssets.every(
            (currentAsset) => currentAsset.id !== uploadedAsset.id
          )
        ),
        ...currentAssets.filter((asset) => asset.status !== "uploading"),
      ]);
    }
    if (deletedAsset?.id) {
      setAssets((currentAssets) => [
        ...currentAssets.filter((asset) => asset.id !== deletedAsset.id),
      ]);
    }
  }, [actionData]);

  const onUploadAsset = (uploadedAssets: Array<BaseAsset>) =>
    setAssets((assets) => [...uploadedAssets, ...assets]);

  return {
    assets: filterByType<BaseAsset>(assets, type),
    onUploadAsset,
  };
};
