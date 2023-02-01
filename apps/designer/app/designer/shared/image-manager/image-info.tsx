import {
  Box,
  Flex,
  Grid,
  DeprecatedText2,
  Button,
} from "@webstudio-is/design-system";
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
import { theme } from "@webstudio-is/design-system";

type ImageInfoProps = {
  asset: Asset;
  onDelete: (ids: Array<string>) => void;
};

export const ImageInfo = ({ asset, onDelete }: ImageInfoProps) => {
  const { size, meta, id, name } = asset;
  return (
    <>
      <Box css={{ p: `${theme.spacing[5]} ${theme.spacing[9]}` }}>
        <Grid columns={2} align="center" gap={2}>
          <Box css={{ width: 100 }}>
            <Filename variant="label">{name}</Filename>
          </Box>
          <Flex align="center" css={{ gap: theme.spacing[3] }}>
            <CloudIcon />
            <DeprecatedText2 variant="label">
              {prettyBytes(size)}
            </DeprecatedText2>
          </Flex>
        </Grid>
      </Box>
      {"width" in meta && "height" in meta ? (
        <Box css={{ p: `${theme.spacing[5]} ${theme.spacing[9]}` }}>
          <Grid columns={2} gap={2} align="center">
            <Flex align="center" css={{ gap: theme.spacing[3] }}>
              <SizeIcon />
              <DeprecatedText2 variant="label">
                {meta.width} x {meta.height}
              </DeprecatedText2>
            </Flex>{" "}
            <Flex align="center" css={{ gap: theme.spacing[3] }}>
              <AspectRatioIcon />
              <DeprecatedText2 variant="label">
                {getFormattedAspectRatio(meta)}
              </DeprecatedText2>
            </Flex>
          </Grid>
        </Box>
      ) : null}
      <Box css={{ p: `${theme.spacing[5]} ${theme.spacing[9]}` }}>
        <Button
          color="destructive"
          onClick={() => onDelete([id])}
          prefix={<TrashIcon />}
        >
          Delete
        </Button>
      </Box>
    </>
  );
};
