import {
  useEffect,
  useState,
  type KeyboardEvent,
  type FocusEvent,
} from "react";
import { Box, styled } from "@webstudio-is/design-system";
import placeholderImage from "~/shared/images/image-placeholder.svg";
import brokenImage from "~/shared/images/broken-image-placeholder.svg";
import { UploadingAnimation } from "./uploading-animation";
import { ImageInfoTrigger, imageInfoTriggerCssVars } from "./image-info-tigger";
import type { PreviewAsset } from "~/designer/shared/assets";
import type { Asset } from "@webstudio-is/asset-uploader";
import { Filename } from "./filename";

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

const ThumbnailContainer = styled(Box, {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "column",
  border: "2px solid transparent",
  borderRadius: "$1",
  outline: 0,
  gap: "$1",
  overflow: "hidden",
  backgroundColor: "$slate4",
  "&:hover": imageInfoTriggerCssVars({ show: true }),
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
  width: "$8",
  height: "$8",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  flexShrink: 0,
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
        if (event.code === "Enter" && asset.status === "uploaded") {
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
      <Box
        css={{
          width: "100%",
          // @todo should be a token from design system
          height: 12,
        }}
      >
        <Filename variant={"tiny"}>{name}</Filename>
      </Box>
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
