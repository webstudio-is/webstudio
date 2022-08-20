import {
  Box,
  Flex,
  Grid,
  IconButton,
  Text,
  Separator,
  Button,
} from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/prisma-client";
import {
  getFormattedAspectRatio,
  getHumanReadableFileSize,
  getStartAndEndOfString,
} from "./utils";
import {
  CloudIcon,
  AspectRatioIcon,
  Cross1Icon,
  SizeIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import { useSubmit } from "@remix-run/react";

type AssetInfoProps = Asset & {
  onClose: () => void;
  setIsDeleting: (isDeleting: boolean) => void;
};

export const AssetInfo = ({
  size,
  width,
  height,
  id,
  name,
  onClose,
  setIsDeleting,
}: AssetInfoProps) => {
  const submit = useSubmit();
  const handleDeleteAsset = () => {
    const formData = new FormData();
    formData.append("assetId", id);
    formData.append("assetName", name);
    onClose();
    setIsDeleting(true);
    submit(formData, { method: "delete" });
  };

  return (
    <>
      <Flex
        css={{ height: 40, paddingLeft: "$3" }}
        align="center"
        justify="between"
      >
        <Text size="1" weight="700">
          Asset Details
        </Text>

        <IconButton
          onClick={onClose}
          size="1"
          css={{ marginRight: "$2" }}
          aria-label="Close"
        >
          <Cross1Icon />
        </IconButton>
      </Flex>
      <Separator />
      <Box css={{ p: "$2 $3" }}>
        <Grid columns={2}>
          <Text size="1">{getStartAndEndOfString(name)}</Text>
          <Flex align="center" css={{ gap: "$1" }}>
            <CloudIcon />
            <Text size="1">{getHumanReadableFileSize(size)}</Text>
          </Flex>
        </Grid>
      </Box>
      <Box css={{ p: "$2 $3" }}>
        <Grid columns={2}>
          <Flex align="center" css={{ gap: "$1" }}>
            <SizeIcon />
            <Text size="1">
              {width} x {height}
            </Text>
          </Flex>{" "}
          <Flex align="center" css={{ gap: "$1" }}>
            <AspectRatioIcon />
            <Text size="1">
              {getFormattedAspectRatio(
                width as unknown as number,
                height as unknown as number
              )}
            </Text>
          </Flex>
        </Grid>
      </Box>
      <Box css={{ p: "$2 $3" }}>
        <Button variant="red" size="2" onClick={handleDeleteAsset}>
          <Flex align="center" css={{ gap: "$1" }}>
            <TrashIcon />
            Delete
          </Flex>
        </Button>
      </Box>
    </>
  );
};
