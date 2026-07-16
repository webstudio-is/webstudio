import {
  forwardRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from "react";
import {
  ArrowFocus,
  Box,
  Flex,
  styled,
  Text,
  theme,
} from "@webstudio-is/design-system";

const thumbnailActionVisibility = "--ws-thumbnail-action-visibility";
const showThumbnailAction = { [thumbnailActionVisibility]: "visible" };
const focusOutline = {
  outline: `1px solid ${theme.colors.borderFocus}`,
  outlineOffset: -1,
};

export const thumbnailActionVisibilityValue = `var(${thumbnailActionVisibility}, hidden)`;

const ThumbnailGroup = styled(Box, {
  position: "relative",
  minWidth: 0,
  variants: {
    selected: {
      true: showThumbnailAction,
    },
  },
  "&:hover, &:focus-within": showThumbnailAction,
});

type AssetThumbnailGroupProps = ComponentProps<typeof ThumbnailGroup> & {
  selected?: boolean;
};

export const AssetThumbnailGroup = forwardRef<
  HTMLDivElement,
  AssetThumbnailGroupProps
>(({ onKeyDown, ...props }, forwardedRef) => (
  <ArrowFocus
    render={({ handleKeyDown }) => (
      <ThumbnailGroup
        {...props}
        ref={forwardedRef}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          if (
            event.defaultPrevented === false &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight")
          ) {
            handleKeyDown(event);
          }
        }}
      />
    )}
  />
));
AssetThumbnailGroup.displayName = "AssetThumbnailGroup";

export const AssetThumbnailAction = styled(Box, {
  position: "absolute",
  right: 4,
  top: 4,
  visibility: thumbnailActionVisibilityValue,
});

const Root = styled("div", {
  all: "unset",
  boxSizing: "border-box",
  position: "relative",
  display: "flex",
  minWidth: 0,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "column",
  borderRadius: theme.borderRadius[4],
  outline: "none",
  gap: theme.spacing[3],
  overflow: "hidden",
  padding: 2,
  "&:hover, &:focus-visible": {
    ...showThumbnailAction,
    backgroundColor: theme.colors.backgroundAssetcardHover,
  },
  "&:focus-visible": {
    ...focusOutline,
  },
  variants: {
    selected: {
      true: {
        ...focusOutline,
        backgroundColor: theme.colors.backgroundAssetcardHover,
        ...showThumbnailAction,
      },
    },
    dropTarget: {
      true: {
        outline: `2px solid ${theme.colors.borderFocus}`,
        backgroundColor: theme.colors.backgroundAssetcardHover,
      },
    },
    clickable: {
      true: { cursor: "pointer" },
    },
  },
});

const Preview = styled(Box, {
  width: "100%",
  height: theme.spacing[19],
  flexShrink: 0,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const Label = styled(Flex, {
  width: "100%",
  paddingBottom: 4,
});

type AssetThumbnailCardProps = Omit<
  ComponentProps<typeof Root>,
  "children" | "as"
> & {
  as?: "div" | "button";
  type?: "button";
  preview: ReactNode;
  label: ReactNode;
  labelSuffix?: ReactNode;
  path?: string;
  children?: ReactNode;
  onPreviewClick?: MouseEventHandler<HTMLDivElement>;
};

export const AssetThumbnailCard = forwardRef<
  HTMLElement,
  AssetThumbnailCardProps
>(
  (
    {
      as = "div",
      preview,
      label,
      labelSuffix,
      path,
      children,
      onPreviewClick,
      ...props
    },
    forwardedRef
  ) => (
    <Root
      {...props}
      as={as}
      ref={forwardedRef as Ref<HTMLDivElement>}
      data-asset-thumbnail=""
    >
      <Preview onClick={onPreviewClick}>{preview}</Preview>
      <Label justify="center">
        <Text variant="tiny" truncate>
          {label}
        </Text>
        {labelSuffix !== undefined && <Text variant="tiny">{labelSuffix}</Text>}
      </Label>
      {path !== undefined && (
        <Text variant="tiny" color="subtle" truncate css={{ width: "100%" }}>
          {path}
        </Text>
      )}
      {children}
    </Root>
  )
);
AssetThumbnailCard.displayName = "AssetThumbnailCard";
