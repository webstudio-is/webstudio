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
import type { ClientAsset } from "~/designer/shared/assets";
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
  margin: "$spacing$2",
  border: "2px solid transparent",
  borderRadius: "$borderRadius$4",
  outline: 0,
  gap: "$spacing$3",
  overflow: "hidden",
  backgroundColor: "$slate4",
  "&:hover": imageInfoTriggerCssVars({ show: true }),
  variants: {
    status: {
      uploading: {},
      uploaded: {},
      deleting: {},
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
  width: "$spacing$19",
  height: "$spacing$19",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  flexShrink: 0,
});

type ImageThumbnailProps = {
  asset: ClientAsset;
  onDelete: (ids: Array<string>) => void;
  onSelect: (asset?: ClientAsset) => void;
  onChange?: (asset: ClientAsset) => void;
  state?: "selected";
};

export const ImageThumbnail = ({
  asset: clientAsset,
  onDelete,
  onSelect,
  onChange,
  state,
}: ImageThumbnailProps) => {
  const asset =
    clientAsset.status === "uploading"
      ? clientAsset.preview
      : clientAsset.asset;

  const { status } = clientAsset;

  const { path, name } = asset;

  const description =
    "description" in asset && asset.description
      ? (asset.description as string)
      : name;

  const isUploading = status === "uploading";
  const isDeleting = status === "deleting";

  const src = useImageWithFallback({ path });

  return (
    <ThumbnailContainer
      title={description}
      tabIndex={0}
      status={status}
      state={state}
      onFocus={() => {
        if (clientAsset.status !== "deleting") {
          onSelect?.(clientAsset);
        }
      }}
      onBlur={(event: FocusEvent) => {
        const isFocusWithin = event.currentTarget.contains(event.relatedTarget);
        if (isFocusWithin === false) {
          onSelect();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.code === "Enter" && clientAsset.status === "uploaded") {
          onChange?.(clientAsset);
        }
      }}
    >
      <Thumbnail
        css={{ backgroundImage: `url("${src}")` }}
        onClick={() => {
          if (clientAsset.status === "uploaded") {
            onChange?.(clientAsset);
          }
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
      {clientAsset.status === "uploaded" && (
        <ImageInfoTrigger
          asset={clientAsset.asset}
          onDelete={(ids) => {
            onDelete(ids);
          }}
        />
      )}
      {(isUploading || isDeleting) && <UploadingAnimation />}
    </ThumbnailContainer>
  );
};
