import type { KeyboardEvent, FocusEvent } from "react";
import { Box, styled } from "@webstudio-is/design-system";
import { UploadingAnimation } from "./uploading-animation";
import { ImageInfoTrigger, imageInfoTriggerCssVars } from "./image-info-tigger";
import type { AssetContainer } from "~/builder/shared/assets";
import { Filename } from "./filename";
import { Image } from "./image";
import { theme } from "@webstudio-is/design-system";

const ThumbnailContainer = styled(Box, {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "column",
  margin: theme.spacing[2],
  border: "2px solid transparent",
  borderRadius: theme.borderRadius[4],
  outline: 0,
  gap: theme.spacing[3],
  overflow: "hidden",
  backgroundColor: theme.colors.slate4,
  "&:hover": imageInfoTriggerCssVars({ show: true }),
  variants: {
    status: {
      uploading: {},
      uploaded: {},
      deleting: {},
    },
    state: {
      selected: {
        boxShadow: `0px 0px 0px 2px ${theme.colors.blue10}, 0px 0px 0px 2px ${theme.colors.blue10}`,
      },
    },
  },
});

const Thumbnail = styled(Box, {
  width: "100%",
  height: theme.spacing[19],
  flexShrink: 0,
  position: "relative",
});

type ImageThumbnailProps = {
  assetContainer: AssetContainer;
  onDelete: (ids: Array<string>) => void;
  onSelect: (assetContainer?: AssetContainer) => void;
  onChange?: (assetContainer: AssetContainer) => void;
  state?: "selected";
};

export const ImageThumbnail = ({
  assetContainer,
  onDelete,
  onSelect,
  onChange,
  state,
}: ImageThumbnailProps) => {
  const { asset, status } = assetContainer;

  const { name, description } = asset;

  const isUploading = status === "uploading";

  return (
    <ThumbnailContainer
      title={description ?? name}
      tabIndex={0}
      status={status}
      state={state}
      onFocus={() => {
        onSelect?.(assetContainer);
      }}
      onBlur={(event: FocusEvent) => {
        const isFocusWithin = event.currentTarget.contains(event.relatedTarget);
        if (isFocusWithin === false) {
          onSelect();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.code === "Enter" && assetContainer.status === "uploaded") {
          onChange?.(assetContainer);
        }
      }}
    >
      <Thumbnail
        onClick={() => {
          if (assetContainer.status === "uploaded") {
            onChange?.(assetContainer);
          }
        }}
      >
        <Image
          assetContainer={assetContainer}
          alt={description ?? name}
          // width={64} used for Image optimizations it should be approximately equal to the width of the picture on the screen in px
          width={64}
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
      {assetContainer.status === "uploaded" && (
        <ImageInfoTrigger
          asset={assetContainer.asset}
          onDelete={(ids) => {
            onDelete(ids);
          }}
        />
      )}
      {isUploading && <UploadingAnimation />}
    </ThumbnailContainer>
  );
};
