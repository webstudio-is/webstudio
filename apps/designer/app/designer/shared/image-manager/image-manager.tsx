import { Box, Flex, Grid } from "@webstudio-is/design-system";
import { ImageThumbnail } from "./image-thumbnail";
import { AssetUpload } from "../assets/asset-upload";
import { useAssets } from "../assets/use-assets";

export const ImageManager = () => {
  const { assets, onSubmitAssets, onActionData, onDelete } = useAssets("image");
  return (
    <Flex gap="3" direction="column" css={{ padding: "$1", paddingTop: "$2" }}>
      <Box css={{ padding: "$2" }}>
        <AssetUpload
          onSubmit={onSubmitAssets}
          onActionData={onActionData}
          type="image"
        />
      </Box>
      <Grid columns={2} gap={2}>
        {assets.map((asset) => (
          <ImageThumbnail key={asset.id} asset={asset} onDelete={onDelete} />
        ))}
      </Grid>
    </Flex>
  );
};
