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
import { formatAssetName } from "~/builder/shared/assets/asset-utils";
import { getFormattedAspectRatio } from "~/builder/shared/asset-manager";

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
          <Grid
            gap={1}
            align="center"
            css={{ gridTemplateColumns: "max-content 1fr" }}
          >
            <ImageIcon />
            <Text truncate variant={"labels"}>
              {formatAssetName(asset)}
            </Text>
          </Grid>
          <Grid columns={2} gap={1} align={"center"}>
            <Flex gap={1}>
              <DimensionsIcon />
              <Text variant={"labels"}>
                {asset.meta.width} x {asset.meta.height} Px
              </Text>
            </Flex>
            <Flex gap={1}>
              <AspectRatioIcon />
              <Text variant={"labels"}>
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
