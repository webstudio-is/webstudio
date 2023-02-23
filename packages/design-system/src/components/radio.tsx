/**
 * Implementation of the "Radio" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1794%3A5804
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-radio-group";
import { type CSS, css, theme } from "../stitches.config";

export { CheckboxAndLabel as RadioAndLabel } from "./checkbox";

const itemStyles = css({
  all: "unset", // reset <button>

  width: theme.spacing[9],
  height: theme.spacing[9],
  display: "block",
  position: "relative",
  borderRadius: theme.borderRadius.round,

  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },

  "&::before": {
    content: "''",
    display: "block",
    position: "absolute",
    boxSizing: "border-box",
    width: "13.3px",
    height: "13.3px",
    inset: "1.35px",
    borderRadius: theme.borderRadius.round,
    background: theme.colors.backgroundControls,
    border: `1.3px solid ${theme.colors.foregroundMain}`,
  },

  "&[data-state=checked]::before": {
    borderColor: theme.colors.foregroundPrimary,
    background: "transparent",
  },

  "&[data-state=checked]::after": {
    content: "''",
    display: "block",
    position: "absolute",
    width: "5.3px",
    height: "5.3px",
    inset: "5.35px",
    borderRadius: theme.borderRadius.round,
    background: theme.colors.foregroundPrimary,
  },

  // [data-state] is needed to make sure the specificity
  // is higher than the above selectors
  "&[data-state]:disabled::before": {
    borderColor: theme.colors.foregroundDisabled,
  },
  "&[data-state]:disabled::after": {
    background: theme.colors.foregroundDisabled,
  },
});

export const Radio = forwardRef(
  (
    {
      className,
      css,
      ...props
    }: ComponentProps<typeof Primitive.Item> & { css?: CSS },
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Item
      className={itemStyles({ className, css })}
      {...props}
      ref={ref}
    />
  )
);
Radio.displayName = "Radio";

export const RadioGroup = Primitive.Root;
