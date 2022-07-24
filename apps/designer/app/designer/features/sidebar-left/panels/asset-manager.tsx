import { ImageIcon } from "~/shared/icons";
import { Flex, Grid, Heading } from "~/shared/design-system";
import { useEffect, useState } from "react";
import { useActionData } from "@remix-run/react";
import { Asset } from "@webstudio-is/prisma-client";
import { AssetManagerImage } from "./components/image";

import { AddAnAssetForm } from "./components/add-an-asset-form";

export const TabContent = ({
  assets: baseAssets,
}: {
  assets: Array<Asset & { uploading?: boolean }>;
}) => {
  const newImages = useActionData();

  const [assets, setAsssets] = useState(baseAssets);

  useEffect(() => {
    if (newImages?.assets.length) {
      setAsssets((currentAssets) => [
        ...newImages.assets,
        ...currentAssets.filter((a) => !a.uploading),
      ]);
    }
  }, [newImages]);

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex justify="between">
        <Heading>Assets</Heading>
        <AddAnAssetForm
          onSubmit={(uploadedAssets: Array<Asset>) =>
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
            uploading={asset.uploading}
          />
        ))}
      </Grid>
    </Flex>
  );
};

export const icon = <ImageIcon />;
