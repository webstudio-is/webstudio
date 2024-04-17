/**
 * Implementation of the "Toolbar Toggle" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1512%3A7422&t=BOWCrlme5NepfLUm-4
 */
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import { Slot, type SlotProps } from "@radix-ui/react-slot";
import { css, styled, theme } from "../stitches.config";
import { separatorStyle } from "./separator";
import { textVariants } from "./text";
import { forwardRef, type Ref } from "react";
import { focusRingStyle } from "./focus-ring";

export const Toolbar = styled(ToolbarPrimitive.Root, {
  display: "flex",
  height: theme.spacing[15],
  background: theme.colors.backgroundTopbar,
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
  gap: theme.spacing[5],
});

export const ToolbarToggleGroup = styled(ToolbarPrimitive.ToggleGroup, {
  display: "flex",
  alignItems: "center",
});

const focusRing = focusRingStyle({
  top: theme.spacing[3],
  bottom: theme.spacing[3],
});

const toggleItemStyle = css(textVariants.labelsTitleCase, {
  // reset styles
  boxSizing: "border-box",
  position: "relative",
  py: 0,
  px: theme.spacing["5"],
  appearance: "none",
  border: "none",
  outline: "none",
  // center icon
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  // prevent shrinking inside flex box
  flexShrink: 0,
  // set size and shape
  minWidth: theme.spacing["15"],
  minHeight: theme.spacing["15"],

  color: "inherit",
  background: "transparent",
  transition: "200ms background",

  "&:focus-visible": focusRing,
  "&:hover, &[data-state=on], &[data-state=open], &[aria-checked=true]": {
    background: theme.colors.backgroundTopbarHover,
  },
  variants: {
    // Just for story
    focused: {
      true: focusRing,
    },
    variant: {
      subtle: {
        color: theme.colors.foregroundSubtle,
        "&:hover, &[data-state=on], &[aria-checked=true]": {
          color: "inherit",
        },
      },
      preview: {
        "&[data-state=on]": {
          color: theme.colors.foregroundSuccess,
        },
      },
    },
  },
});

export const ToolbarToggleItem = styled(
  ToolbarPrimitive.ToggleItem,
  toggleItemStyle
);

type ToolbarButtonProps = SlotProps & {
  asChild?: boolean;
};

const ToolbarButtonBase = forwardRef(
  ({ asChild, ...props }: ToolbarButtonProps, ref: Ref<HTMLButtonElement>) => {
    const Component = asChild ? Slot : "button";
    return <Component {...props} ref={ref} />;
  }
);
ToolbarButtonBase.displayName = "ToolbarButton";

export const ToolbarButton = styled(ToolbarButtonBase, toggleItemStyle);

export const ToolbarSeparator = styled(
  ToolbarPrimitive.Separator,
  separatorStyle,
  { background: theme.colors.borderDark }
);
