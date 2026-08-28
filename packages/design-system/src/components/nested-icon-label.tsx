/**
 * Implementation of the "Nested Icon Label" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=148-3161
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import { type CSS, css, theme } from "../stitches.config";
import type { labelColors } from "./label";
import { cssVar } from "../css-var";

const presetBackground = cssVar("--border-default");
const overwrittenBackground = `color-mix(in oklab, ${cssVar(
  "--background-negative"
)} 16%, ${cssVar("--background-primary")})`;
const overwrittenBorder = `color-mix(in oklab, ${cssVar(
  "--background-negative"
)} 44%, ${cssVar("--background-primary")})`;

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
    border: cssVar("--border-informative"),
    background: cssVar("--background-informative-subtle"),
    backgroundHover: withInteractionOverlay(
      cssVar("--background-informative-subtle")
    ),
    icon: cssVar("--foreground-informative"),
  },
  overwritten: {
    border: overwrittenBorder,
    background: overwrittenBackground,
    backgroundHover: withInteractionOverlay(overwrittenBackground),
    icon: cssVar("--foreground-negative"),
  },
  remote: {
    border: cssVar("--border-warning"),
    background: cssVar("--background-warning-subtle"),
    backgroundHover: withInteractionOverlay(
      cssVar("--background-warning-subtle")
    ),
    icon: cssVar("--foreground-warning"),
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
  width: theme.spacing[10],
  height: theme.spacing[10],
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
      overwritten: perColorStyle("overwritten"),
      remote: perColorStyle("remote"),
      inactive: perColorStyle("inactive"),
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
