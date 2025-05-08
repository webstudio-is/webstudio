import {
  IconButton,
  Text,
  Grid,
  theme,
  Flex,
} from "@webstudio-is/design-system";
import {
  AspectRatioIcon,
  TrashIcon,
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
    <Grid gap={1} flow={"column"} align={"center"} justify={"between"}>
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
        <Grid
          columns={1}
          css={{ padding: theme.panel.padding, width: theme.spacing[34] }}
          gap={2}
          align={"center"}
        >
          <Grid flow={"column"} gap={1} align={"center"}>
            <ImageIcon />
            <Text truncate variant={"labelsTitleCase"}>
              {asset.name}
            </Text>
          </Grid>
          <Grid columns={2} gap={1} align={"center"}>
            <Flex gap={1}>
              <DimensionsIcon />
              <Text variant={"labelsTitleCase"}>
                {asset.meta.width} x {asset.meta.height} Px
              </Text>
            </Flex>
            <Flex gap={1}>
              <AspectRatioIcon />
              <Text variant={"labelsTitleCase"}>
                {getFormattedAspectRatio(asset.meta)}
              </Text>
            </Flex>
          </Grid>
        </Grid>
      </Grid>
      <IconButton onClick={onDelete}>
        <TrashIcon />
      </IconButton>
    </Grid>
  );
};
