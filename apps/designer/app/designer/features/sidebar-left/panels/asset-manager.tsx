import { ImageIcon } from "@webstudio-is/icons";
import { Flex, Grid, Heading } from "@webstudio-is/design-system";
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

  const [assets, setAssets] = useState(baseAssets);

  useEffect(() => {
    if (newImages?.length) {
      setAssets((currentAssets) => [
        ...newImages,
        ...currentAssets.filter((asset) => asset.status !== "uploading"),
      ]);
    }
  }, [newImages]);

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex justify="between">
        <Heading>Assets</Heading>
        <AddAnAssetForm
          onSubmit={(uploadedAssets: Array<UploadingAsset>) =>
            setAssets((assets) => [...uploadedAssets, ...assets])
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
