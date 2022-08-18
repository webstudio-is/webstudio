import { useEffect, useState } from "react";
import { Box, Button, Flex, Tooltip } from "@webstudio-is/design-system";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { useSubmit } from "@remix-run/react";
import { Asset } from "~/designer/features/sidebar-left/types";
import { Cross2Icon } from "@radix-ui/react-icons";
import { UploadingAnimation } from "./uploading-animation";

const useImageWithFallback = ({
  path = placeholderImage,
}: {
  path?: string;
}) => {
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
          content={
            <Flex direction="column" gap={1} align="center" justify="center">
              Are you sure you want to delete this asset?
              <Button variant="red" onClick={deleteAsset}>
                Delete
              </Button>
            </Flex>
          }
        >
          <Button
            variant="raw"
            title="Delete asset"
            onClick={() => setTolltipOpen(true)}
            css={{
              position: "absolute",
              top: "$1",
              right: "$1",
              cursor: "pointer",
              color: "$highContrast",
            }}
          >
            <Cross2Icon />
          </Button>
        </Tooltip>
      )}
      {(isUploading || isDeleting) && (
        <UploadingAnimation isDeleting={isDeleting} isUploading={isUploading} />
      )}
    </Box>
  );
};
