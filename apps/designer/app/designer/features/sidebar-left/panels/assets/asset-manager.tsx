import { ImageIcon } from "@webstudio-is/icons";
import { Box, Flex, Grid } from "@webstudio-is/design-system";
import { AssetUpload, useAssets } from "~/designer/shared/assets";
import { TabName } from "../../types";
import { Header } from "../../lib/header";
import { AssetThumbnail } from "./asset-thumbnail";

export const TabContent = ({
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
}) => {
  const { assets, onSubmitAssets, onActionData } = useAssets("image");
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
        <Box css={{ padding: "$2" }}>
          <AssetUpload
            onSubmit={onSubmitAssets}
            onActionData={onActionData}
            type="image"
          />
        </Box>
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
