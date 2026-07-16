import {
  forwardRef,
  type ComponentProps,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from "react";
import { Box, Flex, styled, Text, theme } from "@webstudio-is/design-system";

const assetInfoTriggerVisibility = "--ws-asset-info-trigger-visibility";
const showAssetInfoTrigger = { [assetInfoTriggerVisibility]: "visible" };

export const assetInfoTriggerVisibilityValue = `var(${assetInfoTriggerVisibility}, hidden)`;

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
    ...showAssetInfoTrigger,
    backgroundColor: theme.colors.backgroundAssetcardHover,
  },
  variants: {
    selected: {
      true: {
        outline: `1px solid ${theme.colors.borderFocus}`,
        outlineOffset: -1,
        backgroundColor: theme.colors.backgroundAssetcardHover,
        ...showAssetInfoTrigger,
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
