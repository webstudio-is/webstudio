import { useEffect, useState } from "react";
import { Box, Button, Tooltip } from "@webstudio-is/design-system";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { UploadingAnimation } from "./uploading-animation";
import { GearIcon } from "@webstudio-is/icons";
import { AssetInfo } from "./asset-info";
import type { Asset } from "@webstudio-is/prisma-client";
import { UploadingAsset } from "../../types";

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

export const AssetManagerThumbnail = (asset: Asset | UploadingAsset) => {
  const { path, alt, status, name } = asset;
  const [isDeleting, setIsDeleting] = useState(false);
  const isUploading = status === "uploading";
  const src = useImageWithFallback({ path });
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const isUploadedAsset = isUploading === false && "size" in asset;

  const closeTooltip = () => setTooltipOpen(false);

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
      {isUploadedAsset && (
        <Tooltip
          open={isTooltipOpen}
          multiline
          onEscapeKeyDown={closeTooltip}
          onPointerDownOutside={closeTooltip}
          css={{ width: 240, maxWidth: 240 }}
          content={
            <AssetInfo
              setIsDeleting={setIsDeleting}
              onClose={() => setTooltipOpen(false)}
              {...asset}
            />
          }
        >
          <Button
            variant="raw"
            title="Options"
            onClick={() => setTooltipOpen(true)}
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
