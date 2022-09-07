import { ImageIcon } from "@webstudio-is/icons";
import { Flex, Grid } from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { useActionData } from "@remix-run/react";
import { TabName } from "../../types";
import { Header } from "../../lib/header";
import { AddAnAssetForm } from "./add-an-asset-form";
import { AssetThumbnail } from "./asset-thumbnail";
import { BaseAsset } from "./types";

export const useAssetsState = (baseAssets: Array<BaseAsset>) => {
  const imageChanges = useActionData();

  const [assets, setAssets] = useState<BaseAsset[]>(baseAssets);

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

  const onUploadAsset = (uploadedAssets: Array<BaseAsset>) =>
    setAssets((assets) => [...uploadedAssets, ...assets]);

  return { assets, onUploadAsset };
};

export const TabContent = ({
  assets: baseAssets,
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
  assets: Array<BaseAsset>;
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
      <Flex
        gap="3"
        direction="column"
        css={{ padding: "$1", paddingTop: "$2" }}
      >
        <Flex justify="end">
          <AddAnAssetForm onSubmit={onUploadAsset} />
        </Flex>
        <Grid columns={2} gap={2}>
          {assets.map((asset) => (
            <AssetThumbnail key={asset.id} {...asset} />
          ))}
        </Grid>
      </Flex>
    </>
  );
};

export const icon = <ImageIcon />;
