import { type KeyboardEvent, type FocusEvent } from "react";
import { Box, styled } from "@webstudio-is/design-system";
import { UploadingAnimation } from "./uploading-animation";
import { ImageInfoTrigger, imageInfoTriggerCssVars } from "./image-info-tigger";
import type { RenderableAsset } from "~/designer/shared/assets";
import { Filename } from "./filename";

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
  flexShrink: 0,
  position: "relative",
});

const Image = styled("img", {
  position: "absolute",
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

type ImageThumbnailProps = {
  asset: RenderableAsset;
  onDelete: (ids: Array<string>) => void;
  onSelect: (asset?: RenderableAsset) => void;
  onChange?: (asset: RenderableAsset) => void;
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

  // In case of preview exists set dataUri as fallback
  const src = clientAsset.preview ? clientAsset.preview.path : path;

  // In case of asset exists set srcSet it will be used even if src is set
  // The main point we are doing this is that switching from src fallback to srcSet has no flickering
  // This solves Image flicker during upload when the real server path becomes available
  const srcSet = clientAsset.asset?.path
    ? `${clientAsset.asset?.path} 1x, ${clientAsset.asset?.path} 2x`
    : undefined;

  return (
    <ThumbnailContainer
      title={description}
      tabIndex={0}
      status={status}
      state={state}
      onFocus={() => {
        onSelect?.(clientAsset);
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
        onClick={() => {
          if (clientAsset.status === "uploaded") {
            onChange?.(clientAsset);
          }
        }}
      >
        <Image src={src} srcSet={srcSet} alt={description} />
      </Thumbnail>
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
      {isUploading && <UploadingAnimation />}
    </ThumbnailContainer>
  );
};
