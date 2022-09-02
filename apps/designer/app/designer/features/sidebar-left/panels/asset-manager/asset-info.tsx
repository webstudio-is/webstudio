import { Box, Flex, Grid, Text, Button } from "@webstudio-is/design-system";
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
import { BaseAsset } from "./types";

const Filename = ({ name }: { name: string }) => {
  const splitName = name.split(".");
  const extension = splitName[splitName.length - 1];
  const lastLetterBeforeExtension = splitName[splitName.length - 2]
    .split("")
    .pop();
  return (
    <Box
      css={{
        position: "relative",
        maxWidth: "70%",
      }}
    >
      <Text
        variant="label"
        data-extension={`${lastLetterBeforeExtension}.${extension}`}
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
};

type AssetInfoProps = BaseAsset & {
  onClose: () => void;
  onDelete: () => void;
};

export const AssetInfo = ({
  size,
  meta,
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
      <Box css={{ p: "$2 $3" }}>
        <Grid columns={2} align="center" gap={2}>
          <Box css={{ width: 100 }}>
            <Filename name={name} />
          </Box>
          <Flex align="center" css={{ gap: "$1" }}>
            <CloudIcon />
            <Text variant="label">{prettyBytes(size)}</Text>
          </Flex>
        </Grid>
      </Box>
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
