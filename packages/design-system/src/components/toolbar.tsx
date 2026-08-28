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
import { cssVar } from "../css-var";

const toolbarBackground = `light-dark(color-mix(in oklab, ${cssVar(
  "--background-inverse"
)} 88%, ${cssVar("--background-primary")}), ${cssVar("--background-primary")})`;
const toolbarForeground = `light-dark(${cssVar(
  "--foreground-on-inverse"
)}, ${cssVar("--foreground-primary")})`;
const toolbarForegroundSubtle = `color-mix(in oklab, ${toolbarForeground} 55%, ${toolbarBackground})`;
const toolbarBorder = `color-mix(in oklab, ${toolbarForeground} 20%, ${toolbarBackground})`;
const toolbarHover = `light-dark(${cssVar(
  "--overlay-on-inverse-hover"
)}, ${cssVar("--overlay-interaction-hover")})`;

export const Toolbar = styled(ToolbarPrimitive.Root, {
  display: "flex",
  height: theme.spacing[15],
  background: toolbarBackground,
  color: toolbarForeground,
  alignItems: "center",
  gap: theme.spacing[5],
});

export const ToolbarToggleGroup = styled(ToolbarPrimitive.ToggleGroup, {
  display: "flex",
  alignItems: "center",
});

const focusRing = focusRingStyle();

const toggleItemStyle = css(textVariants.labels, {
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
    background: toolbarHover,
  },
  variants: {
    // Just for story
    focused: {
      true: focusRing,
    },
    variant: {
      subtle: {
        color: toolbarForegroundSubtle,
        "&:hover, &[data-state=on], &[aria-checked=true]": {
          color: "inherit",
        },
      },
      preview: {
        "&[data-state=on]": {
          color: cssVar("--foreground-positive"),
        },
      },
      chevron: {
        minWidth: "auto",
        paddingInline: 0,
        color: toolbarForegroundSubtle,
        "&:hover, &:focus-visible, &[aria-expanded=true]": {
          color: toolbarForeground,
        },
        "&:focus-visible": focusRingStyle({ left: 0, right: 0 }),
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
  { background: toolbarBorder }
);
