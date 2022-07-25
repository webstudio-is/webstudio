import { ImageIcon } from "~/shared/icons";
import { Flex, Grid, Heading } from "~/shared/design-system";
import { useEffect, useState } from "react";
import { useActionData } from "@remix-run/react";
import { Asset } from "@webstudio-is/prisma-client";
import { AssetManagerImage } from "./components/image";

import { AddAnAssetForm } from "./components/add-an-asset-form";
import { UploadingAsset } from "../types";

export const TabContent = ({
  assets: baseAssets,
}: {
  assets: Array<Asset | UploadingAsset>;
}) => {
  const newImages = useActionData();

  const [assets, setAsssets] = useState(baseAssets);

  useEffect(() => {
    if (newImages?.length) {
      setAsssets((currentAssets) => [
        ...newImages,
        ...currentAssets.filter((asset) => !("uploading" in asset)),
      ]);
    }
  }, [newImages]);

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex justify="between">
        <Heading>Assets</Heading>
        <AddAnAssetForm
          onSubmit={(uploadedAssets: Array<UploadingAsset>) =>
            setAsssets((assets) => [...uploadedAssets, ...assets])
          }
        />
      </Flex>
      <Grid columns={2} gap={2}>
        {assets.map((asset) => (
          <AssetManagerImage
            key={asset.id}
            path={asset.path}
            alt={asset.alt || asset.name}
            status={asset.status}
          />
        ))}
      </Grid>
    </Flex>
  );
};

export const icon = <ImageIcon />;
