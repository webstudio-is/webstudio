import { Flex, Box } from "@webstudio-is/design-system";
import { AssetUpload, useAssets } from "~/designer/shared/assets";

export const FontsManager = () => {
  const { assets, onUploadAsset } = useAssets([], "font");
  return (
    <Flex gap="3" direction="column" css={{ padding: "$1", paddingTop: "$2" }}>
      <Box css={{ padding: "$2" }}>
        <AssetUpload onSubmit={onUploadAsset} type="font" />
      </Box>
      {assets.map((asset) => asset.name)}
    </Flex>
  );
};
