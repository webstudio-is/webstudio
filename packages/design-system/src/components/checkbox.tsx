/**
 * Implementation of the "Checkbox" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3352
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-checkbox";
import {
  CheckboxCheckedFilledIcon,
  CheckboxMixedFilledIcon,
  CheckboxEmptyIcon,
} from "@webstudio-is/icons";
import { type CSS, css, theme, styled } from "../stitches.config";

const checkboxStyle = css({
  all: "unset", // reset <button>

  width: theme.spacing[9],
  height: theme.spacing[9],
  display: "block",
  position: "relative",
  borderRadius: theme.borderRadius[3],
  color: theme.colors.foregroundMain,

  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },

  "&[data-state=checked], &[data-state=indeterminate]": {
    color: theme.colors.foregroundPrimary,
  },

  // [data-state] is needed to make selector specificity higher
  "&[data-state]:disabled": {
    color: theme.colors.foregroundDisabled,
  },

  "&:not(:disabled)::before": {
    content: "''",
    display: "block",
    position: "absolute",
    width: theme.spacing[7],
    height: theme.spacing[7],
    top: theme.spacing[2],
    left: theme.spacing[2],
    borderRadius: theme.borderRadius[2],
    background: theme.colors.backgroundControls,
  },
});

const iconStyle = css({ position: "relative" });

const iconByState = {
  checked: CheckboxCheckedFilledIcon,
  unchecked: CheckboxEmptyIcon,
  indeterminate: CheckboxMixedFilledIcon,
};

// We need this component basicslly just to get access to "data-state".
// We could render all icons and hide one using CSS,
// but that probably will be less performant.
const Button = forwardRef(
  (
    props: ComponentProps<"button"> & {
      "data-state"?: "checked" | "unchecked" | "indeterminate";
    },
    ref: Ref<HTMLButtonElement>
  ) => {
    const Icon = iconByState[props["data-state"] ?? "unchecked"];
    return (
      <button {...props} ref={ref}>
        <Icon className={iconStyle()} />
      </button>
    );
  }
);
Button.displayName = "Button";

export const Checkbox = forwardRef(
  (
    {
      className,
      css,
      ...props
    }: ComponentProps<typeof Primitive.Root> & { css?: CSS },
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Root
      className={checkboxStyle({ className, css })}
      {...props}
      ref={ref}
      asChild
    >
      <Button />
    </Primitive.Root>
  )
);
Checkbox.displayName = "Checkbox";

export const CheckboxAndLabel = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
});
