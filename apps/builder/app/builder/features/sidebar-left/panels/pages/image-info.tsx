import { IconButton, Text, Grid, theme } from "@webstudio-is/design-system";
import {
  AspectRatioIcon,
  DeleteIcon,
  DimensionsIcon,
  ImageIcon,
} from "@webstudio-is/icons";
import type { ImageAsset } from "@webstudio-is/sdk";
import { getFormattedAspectRatio } from "~/builder/shared/image-manager/utils";

type ImageInfoProps = {
  asset: ImageAsset;
  onDelete: () => void;
};

export const ImageInfo = ({ asset, onDelete }: ImageInfoProps) => {
  return (
    <Grid gap={1} flow={"column"} align={"center"} justify={"start"}>
      <Grid
        gap={2}
        flow={"column"}
        align={"center"}
        justify={"start"}
        css={{
          borderRadius: theme.borderRadius[4],
          border: `1px solid ${theme.colors.borderMain}`,
          backgroundColor: theme.colors.white,
          padding: theme.spacing[4],
          justifySelf: "start",
          pr: theme.spacing[5],
        }}
      >
        <Grid flow={"column"} gap={1} align={"center"}>
          <ImageIcon />
          <Text truncate variant={"labelsTitleCase"}>
            {asset.name}
          </Text>
        </Grid>
        |
        <Grid flow={"column"} gap={1} align={"center"}>
          <DimensionsIcon />
          <Text variant={"labelsTitleCase"}>
            {asset.meta.width} x {asset.meta.height} Px
          </Text>
        </Grid>
        |
        <Grid flow={"column"} gap={1} align={"center"}>
          <AspectRatioIcon />
          <Text variant={"labelsTitleCase"}>
            {getFormattedAspectRatio(asset.meta)}
          </Text>
        </Grid>
      </Grid>
      <IconButton onClick={onDelete}>
        <DeleteIcon />
      </IconButton>
    </Grid>
  );
};
