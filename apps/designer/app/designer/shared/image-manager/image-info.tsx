import { Box, Flex, Grid, Text, Button } from "@webstudio-is/design-system";
import { getFormattedAspectRatio } from "./utils";
import {
  CloudIcon,
  AspectRatioIcon,
  SizeIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import prettyBytes from "pretty-bytes";
import { Asset } from "@webstudio-is/asset-uploader";
import { Filename } from "./filename";

type ImageInfoProps = {
  asset: Asset;
  onDelete: (ids: Array<string>) => void;
};

export const ImageInfo = ({ asset, onDelete }: ImageInfoProps) => {
  const { size, meta, id, name } = asset;
  return (
    <>
      <Box css={{ p: "$2 $3" }}>
        <Grid columns={2} align="center" gap={2}>
          <Box css={{ width: 100 }}>
            <Filename variant="label">{name}</Filename>
          </Box>
          <Flex align="center" css={{ gap: "$1" }}>
            <CloudIcon />
            <Text variant="label">{prettyBytes(size)}</Text>
          </Flex>
        </Grid>
      </Box>
      {"width" in meta && "height" in meta ? (
        <Box css={{ p: "$2 $3" }}>
          <Grid columns={2} gap={2} align="center">
            <Flex align="center" css={{ gap: "$1" }}>
              <SizeIcon />
              <Text variant="label">
                {meta.width} x {meta.height}
              </Text>
            </Flex>{" "}
            <Flex align="center" css={{ gap: "$1" }}>
              <AspectRatioIcon />
              <Text variant="label">{getFormattedAspectRatio(meta)}</Text>
            </Flex>
          </Grid>
        </Box>
      ) : null}
      <Box css={{ p: "$2 $3" }}>
        <Button variant="red" size="2" onClick={() => onDelete([id])}>
          <Flex align="center" css={{ gap: "$1" }}>
            <TrashIcon />
            Delete
          </Flex>
        </Button>
      </Box>
    </>
  );
};
