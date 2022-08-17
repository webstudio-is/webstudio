import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  Tooltip,
  Separator,
  Grid,
} from "@webstudio-is/design-system";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { useSubmit } from "@remix-run/react";
import { Asset } from "~/designer/features/sidebar-left/types";
import { UploadingAnimation } from "./uploading-animation";
import {
  CloudIcon,
  AspectRatioIcon,
  Cross1Icon,
  GearIcon,
  SizeIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import {
  getAspectRatio,
  getStartAndEndOfString,
  getHumanReadableFileSize,
} from "./utils";

const useImageWithFallback = ({ path }: { path: string }) => {
  const [src, setSrc] = useState(placeholderImage);

  useEffect(() => {
    const newImage = new Image();
    newImage.onload = () => setSrc(path);
    newImage.onerror = () => setSrc(brokenImage);
    newImage.src = path;
  }, [path]);

  return src;
};

export const AssetManagerThumbnail = ({
  path,
  alt,
  status,
  size,
  width,
  height,
  name,
  id,
}: Asset) => {
  const submit = useSubmit();
  const [isDeleting, setIsDeleting] = useState(false);
  const isUploading = status === "uploading";
  const src = useImageWithFallback({ path });
  const [isTooltipOpen, setTolltipOpen] = useState(false);

  const closeTooltip = () => setTolltipOpen(false);

  const deleteAsset = () => {
    const formData = new FormData();
    formData.append("assetId", id);
    formData.append("assetName", name);
    closeTooltip();
    setIsDeleting(true);
    submit(formData, { method: "delete" });
  };

  return (
    <Box
      title={alt || name}
      css={{
        aspectRatio: "1/1",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 $2",
        position: "relative",
      }}
    >
      <Box
        css={{
          backgroundImage: `url("${src}")`,
          width: "100%",
          height: "100%",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          position: "absolute",
          left: 0,
          top: 0,
          ...(isUploading ? { filter: "blur(1px)", opacity: 0.7 } : {}),
        }}
      ></Box>
      {isUploading === false && (
        <Tooltip
          open={isTooltipOpen}
          multiline
          onEscapeKeyDown={closeTooltip}
          onPointerDownOutside={closeTooltip}
          css={{ width: 240, maxWidth: 240 }}
          content={
            <>
              <Flex
                css={{ height: 40, paddingLeft: "$3" }}
                align="center"
                justify="between"
              >
                <Text size="1" css={{ fontWeight: "bold" }}>
                  Asset Details
                </Text>

                <IconButton
                  onClick={() => setTolltipOpen(false)}
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
                    <Text size="1">{getAspectRatio(width, height)}</Text>
                  </Flex>
                </Grid>
              </Box>
              <Box css={{ p: "$2 $3" }}>
                <Button variant="red" size="2" onClick={deleteAsset}>
                  <Flex align="center" css={{ gap: "$1" }}>
                    <TrashIcon />
                    Delete
                  </Flex>
                </Button>
              </Box>
            </>
          }
        >
          <Button
            variant="raw"
            title="Options"
            onClick={() => setTolltipOpen(true)}
            css={{
              position: "absolute",
              top: "$1",
              right: "$1",
              cursor: "pointer",
              color: "$highContrast",
            }}
          >
            <GearIcon />
          </Button>
        </Tooltip>
      )}
      {(isUploading || isDeleting) && (
        <UploadingAnimation isDeleting={isDeleting} isUploading={isUploading} />
      )}
    </Box>
  );
};
