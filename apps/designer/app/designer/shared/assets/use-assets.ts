import { useEffect, useState } from "react";
import { useActionData } from "@remix-run/react";
import { BaseAsset } from "./types";

export const useAssets = (baseAssets: Array<BaseAsset>) => {
  const changes = useActionData();

  const [assets, setAssets] = useState<BaseAsset[]>(baseAssets);

  useEffect(() => {
    if (changes?.errors) {
      setAssets((currentAssets) =>
        currentAssets.filter((asset) => asset.status !== "uploading")
      );
    }
    if (changes?.uploadedAssets?.length) {
      setAssets((currentAssets) => [
        ...changes.uploadedAssets,
        ...currentAssets.filter((asset) => asset.status !== "uploading"),
      ]);
    }
    if (changes?.deletedAsset?.id) {
      setAssets((currentAssets) => [
        ...currentAssets.filter(
          (asset) => asset.id !== changes.deletedAsset.id
        ),
      ]);
    }
  }, [changes]);

  const onUploadAsset = (uploadedAssets: Array<BaseAsset>) =>
    setAssets((assets) => [...uploadedAssets, ...assets]);

  return { assets, onUploadAsset };
};
