import {
  Box,
  Flex,
  Grid,
  Text,
  Separator,
  Button,
} from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/prisma-client";
import { getFormattedAspectRatio } from "./utils";
import {
  CloudIcon,
  AspectRatioIcon,
  SizeIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import { useSubmit } from "@remix-run/react";
import prettyBytes from "pretty-bytes";
import { Header } from "../../lib/header";

const Filename = ({ name }: { name: string }) => (
  <Box
    css={{
      position: "relative",
      maxWidth: "70%",
    }}
  >
    <Text
      size="1"
      data-extension={name.split(".").pop()}
      css={{
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
        "&::after": {
          content: "attr(data-extension)",
          position: "absolute",
          left: "100%",
          top: 0,
          whiteSpace: "nowrap",
        },
      }}
    >
      {name}
    </Text>
  </Box>
);

type AssetInfoProps = Asset & {
  onClose: () => void;
  onDelete: () => void;
};

export const AssetInfo = ({
  size,
  width,
  height,
  id,
  name,
  onClose,
  onDelete,
}: AssetInfoProps) => {
  const submit = useSubmit();
  const handleDeleteAsset = () => {
    const formData = new FormData();
    formData.append("assetId", id);
    formData.append("assetName", name);
    onClose();
    onDelete();
    submit(formData, { method: "delete" });
  };

  return (
    <>
      <Header title="Asset Details" onClose={onClose} />
      <Separator />
      <Box css={{ p: "$2 $3" }}>
        <Grid columns={2} align="center">
          <Box css={{ width: 100 }}>
            <Filename name={name} />
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
            <Text size="1">{getFormattedAspectRatio(width, height)}</Text>
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
