import { useEffect, useState } from "react";
import { Box, styled } from "@webstudio-is/design-system";
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

const ThumbnailContainer = styled("div", {
  aspectRatio: "1/1",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0 $2",
  position: "relative",
  "&:hover": imageInfoTriggerCssVars({ show: true }),
  borderRadius: "$1",
  outline: 0,
  variants: {
    status: {
      uploading: {
        filter: "blur(1px)",
        opacity: 0.7,
      },
      uploaded: {},
    },
    state: {
      selected: {
        boxShadow:
          "0px 0px 0px 2px $colors$blue10, 0px 0px 0px 2px $colors$blue10",
      },
    },
  },
});

const Thumbnail = styled(Box, {
  width: "100%",
  height: "100%",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  position: "absolute",
  left: 0,
  top: 0,
});

type ImageThumbnailProps = {
  asset: Asset | PreviewAsset;
  onDelete: (ids: Array<string>) => void;
  onSelect: (asset?: Asset | PreviewAsset) => void;
  onChange?: (asset: Asset) => void;
  state?: "selected";
};

export const ImageThumbnail = ({
  asset,
  onDelete,
  onSelect,
  onChange,
  state,
}: ImageThumbnailProps) => {
  const { path, status, name } = asset;
  const description =
    "description" in asset && asset.description ? asset.description : name;
  const isUploading = status === "uploading";
  const isUploadedAsset = isUploading === false && "size" in asset;
  const [isDeleting, setIsDeleting] = useState(false);
  const src = useImageWithFallback({ path });

  return (
    <ThumbnailContainer
      title={description}
      tabIndex={0}
      status={status}
      state={state}
      onFocus={() => onSelect?.(asset)}
      onBlur={(event: FocusEvent) => {
        const isFocusWithin = event.currentTarget.contains(event.relatedTarget);
        if (isFocusWithin === false) {
          onSelect();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.code === "Enter") {
          onChange?.(asset);
        }
      }}
    >
      <Thumbnail
        css={{ backgroundImage: `url("${src}")` }}
        onClick={() => {
          if (isUploadedAsset) onChange?.(asset);
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
    </ThumbnailContainer>
  );
};
