import { ImageIcon } from "@webstudio-is/icons";
import { Flex, Grid } from "@webstudio-is/design-system";
import {
  AssetUpload,
  useAssets,
  type BaseAsset,
} from "~/designer/shared/assets";
import { TabName } from "../../types";
import { Header } from "../../lib/header";
import { AssetThumbnail } from "./asset-thumbnail";

export const TabContent = ({
  assets: loadedAssets,
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
  assets: Array<BaseAsset>;
}) => {
  const { assets, onUploadAsset } = useAssets(loadedAssets);
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
          <AssetUpload onSubmit={onUploadAsset} accept="image/*" />
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
