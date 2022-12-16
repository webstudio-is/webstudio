import { type KeyboardEvent, type FocusEvent } from "react";
import { Box, theme, styled } from "@webstudio-is/design-system";
import { UploadingAnimation } from "./uploading-animation";
import { ImageInfoTrigger, imageInfoTriggerCssVars } from "./image-info-tigger";
import type { RenderableAsset } from "~/designer/shared/assets";
import { Filename } from "./filename";
import { Image } from "./image";

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
  // Below we use theme.spacing[19].value, must be in sync
  width: "$spacing$19",
  height: "$spacing$19",
  flexShrink: 0,
  position: "relative",
});

type ImageThumbnailProps = {
  asset: RenderableAsset;
  onDelete: (ids: Array<string>) => void;
  onSelect: (asset?: RenderableAsset) => void;
  onChange?: (asset: RenderableAsset) => void;
  state?: "selected";
};

const getInt = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const vNum = Number.parseFloat(value);

    if (!Number.isNaN(vNum)) {
      return Math.round(vNum);
    }
  }

  return undefined;
};

export const ImageThumbnail = ({
  asset: renderableAsset,
  onDelete,
  onSelect,
  onChange,
  state,
}: ImageThumbnailProps) => {
  const asset =
    renderableAsset.status === "uploading"
      ? renderableAsset.preview
      : renderableAsset.asset;

  const { status } = renderableAsset;

  const { name } = asset;

  const description =
    "description" in asset && asset.description
      ? (asset.description as string)
      : name;

  const isUploading = status === "uploading";

  // Must be the same as the Thumbnail width "$spacing$19"
  const imageWidth = getInt(theme.spacing[19].value) ?? 64;

  return (
    <ThumbnailContainer
      title={description}
      tabIndex={0}
      status={status}
      state={state}
      onFocus={() => {
        onSelect?.(renderableAsset);
      }}
      onBlur={(event: FocusEvent) => {
        const isFocusWithin = event.currentTarget.contains(event.relatedTarget);
        if (isFocusWithin === false) {
          onSelect();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.code === "Enter" && renderableAsset.status === "uploaded") {
          onChange?.(renderableAsset);
        }
      }}
    >
      <Thumbnail
        onClick={() => {
          if (renderableAsset.status === "uploaded") {
            onChange?.(renderableAsset);
          }
        }}
      >
        <Image
          renderableAsset={renderableAsset}
          alt={description}
          width={imageWidth}
        />
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
      {renderableAsset.status === "uploaded" && (
        <ImageInfoTrigger
          asset={renderableAsset.asset}
          onDelete={(ids) => {
            onDelete(ids);
          }}
        />
      )}
      {isUploading && <UploadingAnimation />}
    </ThumbnailContainer>
  );
};
