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
import { getFormattedAspectRatio } from "./utils";
import {
  CloudIcon,
  AspectRatioIcon,
  Cross1Icon,
  SizeIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import { useSubmit } from "@remix-run/react";
import prettyBytes from "pretty-bytes";

const truncatedText = {
  position: "relative",
  maxWidth: 80,

  div: {
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",

    "&:after": {
      content: "attr(data-extension)",
      position: "absolute",
      left: "100%",
      top: 0,
      whiteSpace: "nowrap",
    },
  },
};

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
        <Grid columns={2} align="center">
          <Box css={{ width: 100 }}>
            <Box css={truncatedText}>
              <Text size="1" data-extension={name.split(".").pop()}>
                {name}
              </Text>
            </Box>
          </Box>
          <Flex align="center" css={{ gap: "$1" }}>
            <CloudIcon />
            <Text size="1">{prettyBytes(size)}</Text>
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
