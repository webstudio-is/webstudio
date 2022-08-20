import { ImageIcon } from "@webstudio-is/icons";
import { Flex, Grid } from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { useActionData } from "@remix-run/react";
import type { Asset } from "@webstudio-is/prisma-client";
import { TabName, UploadingAsset } from "../../types";
import { Header } from "../../lib/header";
import { AddAnAssetForm } from "./add-an-asset-form";
import { AssetManagerThumbnail } from "./thumbnail";

export const useAssetsState = (baseAssets: Array<Asset>) => {
  const imageChanges = useActionData();

  const [assets, setAssets] = useState<Asset[] | UploadingAsset[]>(baseAssets);

  useEffect(() => {
    if (imageChanges?.errors) {
      setAssets((currentAssets) =>
        currentAssets.filter((asset) => asset.status !== "uploading")
      );
    }
    if (imageChanges?.uploadedAssets?.length) {
      setAssets((currentAssets) => [
        ...imageChanges.uploadedAssets,
        ...currentAssets.filter((asset) => asset.status !== "uploading"),
      ]);
    }
    if (imageChanges?.deletedAsset?.id) {
      setAssets((currentAssets) => [
        ...currentAssets.filter(
          (asset) => asset.id !== imageChanges.deletedAsset.id
        ),
      ]);
    }
  }, [imageChanges]);

  const onUploadAsset = (uploadedAssets: Array<UploadingAsset>) =>
    setAssets((assets) => [...uploadedAssets, ...assets]);

  return { assets, onUploadAsset };
};

export const TabContent = ({
  assets: baseAssets,
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
  assets: Array<Asset>;
}) => {
  const { assets, onUploadAsset } = useAssetsState(baseAssets);
  return (
    <>
      <Header
        title="Assets"
        onClose={() => {
          onSetActiveTab("none");
        }}
      />
      <Flex gap="3" direction="column" css={{ padding: "$1" }}>
        <Flex justify="end">
          <AddAnAssetForm onSubmit={onUploadAsset} />
        </Flex>
        <Grid columns={2} gap={2}>
          {assets.map((asset) => (
            <AssetManagerThumbnail key={asset.id} {...asset} />
          ))}
        </Grid>
      </Flex>
    </>
  );
};

export const icon = <ImageIcon />;
