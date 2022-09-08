import { Flex } from "@webstudio-is/design-system";
import { AssetUpload, useAssets } from "~/designer/shared/assets";

export const FontsManager = () => {
  const { assets, onUploadAsset } = useAssets([]);
  return (
    <Flex gap="3" direction="column" css={{ padding: "$1", paddingTop: "$2" }}>
      <Flex justify="end">
        <AssetUpload onSubmit={onUploadAsset} accept=".woff2,.woff,.ttf" />
      </Flex>
      {assets.map((asset) => asset.name)}
    </Flex>
  );
};
