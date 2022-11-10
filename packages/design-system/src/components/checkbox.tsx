import React from "react";
import { styled, CSS, VariantProps } from "../stitches.config";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "@webstudio-is/icons";

const StyledCheckbox = styled(CheckboxPrimitive.Root, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },

  alignItems: "center",
  appearance: "none",
  display: "inline-flex",
  justifyContent: "center",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  padding: "0",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",

  color: "$hiContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  overflow: "hidden",
  "@hover": {
    "&:hover": {
      boxShadow: "inset 0 0 0 1px $colors$slate8",
    },
  },
  "&:focus": {
    outline: "none",
    borderColor: "$red7",
    boxShadow: "inset 0 0 0 1px $colors$blue9, 0 0 0 1px $colors$blue9",
  },

  variants: {
    size: {
      "1": {
        width: "$spacing$9",
        height: "$spacing$9",
        borderRadius: "$borderRadius$4",
      },
      "2": {
        width: "$spacing$11",
        height: "$spacing$11",
        borderRadius: "$borderRadius$6",
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});

const StyledIndicator = styled(CheckboxPrimitive.Indicator, {
  alignItems: "center",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  width: "100%",
});

type CheckboxPrimitiveProps = React.ComponentProps<
  typeof CheckboxPrimitive.Root
>;
type CheckboxVariants = VariantProps<typeof StyledCheckbox>;
type CheckboxProps = CheckboxPrimitiveProps & CheckboxVariants & { css?: CSS };

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof StyledCheckbox>,
  CheckboxProps
>((props, forwardedRef) => (
  <StyledCheckbox {...props} ref={forwardedRef}>
    <StyledIndicator>
      <CheckIcon />
    </StyledIndicator>
  </StyledCheckbox>
));

Checkbox.displayName = "Checkbox";
