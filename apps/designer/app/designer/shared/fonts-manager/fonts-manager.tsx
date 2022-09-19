import { Flex, Box } from "@webstudio-is/design-system";
import { AssetUpload, useAssets } from "~/designer/shared/assets";

export const FontsManager = () => {
  const { assets, onSubmitAssets, onActionData } = useAssets("font");
  return (
    <Flex gap="3" direction="column" css={{ padding: "$1", paddingTop: "$2" }}>
      <Box css={{ padding: "$2" }}>
        <AssetUpload
          onSubmit={onSubmitAssets}
          onActionData={onActionData}
          type="font"
        />
      </Box>
      {assets.map((asset) => asset.name)}
    </Flex>
  );
};
