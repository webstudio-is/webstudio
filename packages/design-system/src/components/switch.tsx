/**
 * Implementation of the "Switch" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1086%3A3430&t=WVRoENiFP3BSlQa7-0
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-switch";
import { type CSS, css, theme } from "../stitches.config";

const padding = theme.spacing[1];
const thumbOffset = `calc(${padding} + ${theme.spacing[1]})`;

const switchStyle = css({
  all: "unset", // reset <button>
  boxSizing: "content-box",
  width: theme.spacing[11],
  height: theme.spacing[8],
  borderRadius: theme.borderRadius.pill,
  position: "relative",
  verticalAlign: "middle",

  // in Figma there's an extra container with a padding
  // so we need a pseudo element
  padding,
  "&:before": {
    content: "''",
    position: "absolute",
    inset: padding,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: theme.colors.backgroundNeutralDark,
  },

  "&[data-state=checked]:not([data-disabled]):before": {
    backgroundColor: theme.colors.backgroundPrimary,
  },

  "&[data-disabled]:before": {
    backgroundColor: theme.colors.foregroundDisabled,
  },

  "&:focus": {
    outline: `1px solid ${theme.colors.borderFocus}`,
  },
});

const thumbStyle = css({
  width: theme.spacing[7],
  height: theme.spacing[7],
  borderRadius: theme.borderRadius.round,
  backgroundColor: theme.colors.foregroundContrastMain,
  position: "absolute",
  top: thumbOffset,
  left: thumbOffset,
  transition: "transform 100ms",
  "&[data-state=checked]": {
    transform: `translateX(${theme.spacing[6]})`,
  },
});

export const Switch = forwardRef(
  (
    {
      className,
      css,
      ...props
    }: ComponentProps<typeof Primitive.Root> & { css?: CSS },
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Root
      className={switchStyle({ className, css })}
      {...props}
      ref={ref}
    >
      <Primitive.Thumb className={thumbStyle()} />
    </Primitive.Root>
  )
);
Switch.displayName = "Switch";
