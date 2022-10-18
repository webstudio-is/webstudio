import { useEffect, useState } from "react";
import { Box } from "@webstudio-is/design-system";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { UploadingAnimation } from "./uploading-animation";
import { ImageInfoTrigger, imageInfoTriggerCssVars } from "./image-info-tigger";
import type { PreviewAsset } from "~/designer/shared/assets";
import { Asset } from "@webstudio-is/asset-uploader";

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

type ThumbnailProps = {
  path?: string;
  status: Asset["status"];
  onClick: () => void;
};

const Thumbnail = ({ path, status, onClick }: ThumbnailProps) => {
  const src = useImageWithFallback({ path });

  return (
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
        ...(status === "uploading"
          ? { filter: "blur(1px)", opacity: 0.7 }
          : {}),
      }}
      onClick={onClick}
    ></Box>
  );
};

export const ImageThumbnail = ({
  asset,
  onDelete,
  onSelect,
}: {
  asset: Asset | PreviewAsset;
  onDelete: (ids: Array<string>) => void;
  onSelect?: (asset: Asset) => void;
}) => {
  const { path, status, name } = asset;
  const description =
    "description" in asset && asset.description ? asset.description : name;
  const [isDeleting, setIsDeleting] = useState(false);
  const isUploading = status === "uploading";
  const isUploadedAsset = isUploading === false && "size" in asset;

  return (
    <Box
      title={description}
      css={{
        aspectRatio: "1/1",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 $2",
        position: "relative",
        "&:hover": imageInfoTriggerCssVars({ show: true }),
      }}
    >
      <Thumbnail
        path={path}
        status={status}
        onClick={() => {
          if (isUploadedAsset) onSelect?.(asset);
        }}
      />
      {isUploadedAsset && (
        <ImageInfoTrigger
          asset={asset}
          onDelete={(ids) => {
            setIsDeleting(true);
            onDelete(ids);
          }}
        />
      )}
      {(isUploading || isDeleting) && <UploadingAnimation />}
    </Box>
  );
};
