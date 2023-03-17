/**
 * Implementation of the "Nested Icon Label" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=148-3161
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import { type CSS, css, theme } from "../stitches.config";
import type { labelColors } from "./label";

const colors = {
  default: {
    border: "transparent",
    background: "transparent",
    backgroundHover: theme.colors.backgroundHover,
    icon: theme.colors.foregroundIconMain,
  },
  preset: {
    border: theme.colors.borderMain,
    background: theme.colors.backgroundPresetMain,
    backgroundHover: theme.colors.backgroundPresetHover,
    icon: theme.colors.foregroundIconMain,
  },
  local: {
    border: theme.colors.borderLocalMain,
    background: theme.colors.backgroundLocalMain,
    backgroundHover: theme.colors.backgroundLocalHover,
    icon: theme.colors.foregroundLocalMain,
  },
  remote: {
    border: theme.colors.borderRemoteMain,
    background: theme.colors.backgroundRemoteMain,
    backgroundHover: theme.colors.backgroundRemoteHover,
    icon: theme.colors.foregroundRemoteMain,
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
    color: theme.colors.foregroundDisabled,
  },
});

const style = css({
  display: "flex",
  width: theme.spacing[11],
  height: theme.spacing[11],
  boxSizing: "border-box",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: theme.borderRadius[2],
  border: "1px solid transparent",
  variants: {
    color: {
      default: perColorStyle("default"),
      preset: perColorStyle("preset"),
      local: perColorStyle("local"),
      remote: perColorStyle("remote"),
    },
  },
  defaultVariants: { color: "default" },
});

type Props = ComponentProps<"label"> & {
  css?: CSS;
  color?: (typeof labelColors)[number];
  disabled?: boolean;
  hover?: boolean;
};

export const NestedIconLabel = forwardRef(
  (
    { css, className, color, disabled, hover, ...props }: Props,
    ref: Ref<HTMLLabelElement>
  ) => (
    <label
      {...props}
      className={style({ css, className, color })}
      data-state={disabled ? "disabled" : hover ? "hover" : undefined}
      ref={ref}
    />
  )
);
NestedIconLabel.displayName = "NestedIconLabel";
