/**
 * Implementation of the "Nested Icon Label" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=148-3161
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import { type CSS, css, theme } from "../stitches.config";
import type { labelColors } from "./label";
import { cssVar } from "../css-var";
import { styleSourceColor } from "./style-source-color";

const presetBackground = cssVar("--border-default");
const withInteractionOverlay = (background: string) =>
  `linear-gradient(${cssVar("--overlay-interaction-hover")}, ${cssVar(
    "--overlay-interaction-hover"
  )}), ${background}`;

const colors = {
  default: {
    border: "transparent",
    background: "transparent",
    backgroundHover: cssVar("--overlay-interaction-hover"),
    icon: cssVar("--foreground-primary"),
  },
  preset: {
    border: cssVar("--border-default"),
    background: presetBackground,
    backgroundHover: withInteractionOverlay(presetBackground),
    icon: cssVar("--foreground-primary"),
  },
  local: {
    border: styleSourceColor.local.border,
    background: styleSourceColor.local.background,
    backgroundHover: withInteractionOverlay(styleSourceColor.local.background),
    icon: styleSourceColor.local.foreground,
  },
  overwritten: {
    border: styleSourceColor.overwritten.border,
    background: styleSourceColor.overwritten.background,
    backgroundHover: withInteractionOverlay(
      styleSourceColor.overwritten.background
    ),
    icon: styleSourceColor.overwritten.foreground,
  },
  remote: {
    border: styleSourceColor.remote.border,
    background: styleSourceColor.remote.background,
    backgroundHover: withInteractionOverlay(styleSourceColor.remote.background),
    icon: styleSourceColor.remote.foreground,
  },
  inactive: {
    border: "transparent",
    background: "transparent",
    backgroundHover: "transparent",
    icon: cssVar("--foreground-secondary"),
  },
} as const;

const perColorStyle = (color: (typeof labelColors)[number]) => ({
  "&:not([data-state=disabled])": {
    color: colors[color].icon,
    borderColor: colors[color].border,
    background: colors[color].background,
  },
  "&:not([data-state=disabled]):hover, &[data-state=hover]": {
    background: colors[color].backgroundHover,
  },
  "&[data-state=disabled]": {
    color: cssVar("--foreground-disabled"),
  },
});

const style = css({
  display: "flex",
  boxSizing: "border-box",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: theme.borderRadius[2],
  border: "1px solid transparent",
  variants: {
    size: {
      1: {
        width: theme.spacing[8],
        height: theme.spacing[8],
        "& > svg": {
          width: theme.spacing[7],
          height: theme.spacing[7],
        },
      },
      2: {
        width: theme.spacing[10],
        height: theme.spacing[10],
      },
    },
    color: {
      default: perColorStyle("default"),
      preset: perColorStyle("preset"),
      local: perColorStyle("local"),
      overwritten: perColorStyle("overwritten"),
      remote: perColorStyle("remote"),
      inactive: perColorStyle("inactive"),
    },
  },
  defaultVariants: { color: "default", size: 2 },
});

type Props = ComponentProps<"label"> & {
  css?: CSS;
  color?: (typeof labelColors)[number];
  disabled?: boolean;
  hover?: boolean;
  size?: "1" | "2";
};

export const NestedIconLabel = forwardRef(
  (
    { css, className, color, disabled, hover, size, ...props }: Props,
    ref: Ref<HTMLLabelElement>
  ) => (
    <label
      {...props}
      className={style({ css, className, color, size })}
      data-state={disabled ? "disabled" : hover ? "hover" : undefined}
      ref={ref}
    />
  )
);
NestedIconLabel.displayName = "NestedIconLabel";
