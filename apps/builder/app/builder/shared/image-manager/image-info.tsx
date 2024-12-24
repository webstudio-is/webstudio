import { useStore } from "@nanostores/react";
import prettyBytes from "pretty-bytes";
import {
  theme,
  Box,
  Flex,
  Grid,
  Text,
  Button,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  CloudIcon,
  AspectRatioIcon,
  DimensionsIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import type { Asset } from "@webstudio-is/sdk";
import { Filename } from "./filename";
import { getFormattedAspectRatio } from "./utils";
import { $authPermit } from "~/shared/nano-states";

type ImageInfoProps = {
  asset: Asset;
  onDelete: (ids: Array<string>) => void;
};

export const ImageInfo = ({ asset, onDelete }: ImageInfoProps) => {
  const { size, meta, id, name } = asset;
  const authPermit = useStore($authPermit);

  const isDeleteDisabled = authPermit === "view";
  const tooltipContent = isDeleteDisabled
    ? "View mode. You can't delete assets."
    : undefined;

  return (
    <>
      <Box css={{ padding: theme.panel.padding }}>
        <Grid columns={2} align="center" gap={2}>
          <Box css={{ width: 100 }}>
            <Filename variant="labelsSentenceCase">{name}</Filename>
          </Box>
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <CloudIcon />
            <Text variant="labelsSentenceCase">{prettyBytes(size)}</Text>
          </Flex>
        </Grid>
      </Box>
      {"width" in meta && "height" in meta ? (
        <Box css={{ padding: theme.panel.padding }}>
          <Grid columns={2} gap={2} align="center">
            <Flex align="center" gap={1}>
              <DimensionsIcon />
              <Text variant="labelsSentenceCase">
                {meta.width} x {meta.height}
              </Text>
            </Flex>{" "}
            <Flex align="center" gap={1}>
              <AspectRatioIcon />
              <Text variant="labelsSentenceCase">
                {getFormattedAspectRatio(meta)}
              </Text>
            </Flex>
          </Grid>
        </Box>
      ) : null}
      <Box css={{ padding: theme.panel.padding }}>
        <Tooltip side="bottom" content={tooltipContent}>
          <Button
            color="destructive"
            onClick={() => onDelete([id])}
            prefix={<TrashIcon />}
            disabled={isDeleteDisabled}
          >
            Delete
          </Button>
        </Tooltip>
      </Box>
    </>
  );
};
