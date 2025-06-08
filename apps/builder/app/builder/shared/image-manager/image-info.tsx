import { useStore } from "@nanostores/react";
import { getMimeByExtension } from "@webstudio-is/asset-uploader";
import {
  Box,
  Button,
  Flex,
  Grid,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  AspectRatioIcon,
  CloudIcon,
  DimensionsIcon,
  PageIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import type { Asset } from "@webstudio-is/sdk";
import prettyBytes from "pretty-bytes";
import { $authPermit } from "~/shared/nano-states";
import { getFormattedAspectRatio } from "./utils";

type ImageInfoProps = {
  asset: Asset;
  onDelete: (ids: Array<string>) => void;
};

export const ImageInfo = ({ asset, onDelete }: ImageInfoProps) => {
  const { size, meta, id, name } = asset;

  const parts = name.split(".");
  const extension = "." + parts.pop();

  const authPermit = useStore($authPermit);

  const isDeleteDisabled = authPermit === "view";
  const tooltipContent = isDeleteDisabled
    ? "View mode. You can't delete assets."
    : undefined;

  return (
    <>
      <Box css={{ width: 250, padding: theme.panel.padding }}>
        <Text truncate>{name}</Text>
      </Box>
      <Box css={{ padding: theme.panel.padding }}>
        <Grid
          columns={2}
          css={{ gridTemplateColumns: "auto auto" }}
          align="center"
          gap={3}
        >
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <CloudIcon />
            <Text variant="labelsSentenceCase">{prettyBytes(size)}</Text>
          </Flex>
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <PageIcon />
            <Text variant="labelsSentenceCase">
              {getMimeByExtension(extension)}
            </Text>
          </Flex>
          {"width" in meta && "height" in meta ? (
            <>
              <Flex align="center" gap={1}>
                <DimensionsIcon />
                <Text variant="labelsSentenceCase">
                  {meta.width} x {meta.height}
                </Text>
              </Flex>
              <Flex align="center" gap={1}>
                <AspectRatioIcon />
                <Text variant="labelsSentenceCase">
                  {getFormattedAspectRatio(meta)}
                </Text>
              </Flex>
            </>
          ) : null}
        </Grid>
      </Box>
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
