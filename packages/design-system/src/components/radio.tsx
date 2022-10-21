import React from "react";
import { styled, CSS, VariantProps } from "../stitches.config";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

export const RadioGroup = styled(RadioGroupPrimitive.Root, {
  display: "flex",
});

const StyledIndicator = styled(RadioGroupPrimitive.Indicator, {
  alignItems: "center",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  width: "100%",
  position: "relative",
  "&::after": {
    content: '""',
    display: "block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "$blue9",
  },
});

const StyledRadio = styled(RadioGroupPrimitive.Item, {
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
  textDecoration: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",

  borderRadius: "50%",
  color: "$hiContrast",
  boxShadow: "inset 0 0 0 1px $colors$muted",
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
        width: "$3",
        height: "$3",
      },
      "2": {
        width: "$5",
        height: "$5",

        [`& ${StyledIndicator}`]: {
          "&::after": {
            width: "$3",
            height: "$3",
          },
        },
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});

type RadioVariants = VariantProps<typeof StyledRadio>;
type RadioGroupItemPrimitiveProps = React.ComponentProps<
  typeof RadioGroupPrimitive.Item
>;
type RadioProps = RadioGroupItemPrimitiveProps & RadioVariants & { css?: CSS };

export const Radio = React.forwardRef<
  React.ElementRef<typeof StyledRadio>,
  RadioProps
>((props, forwardedRef) => (
  <StyledRadio {...props} ref={forwardedRef}>
    <StyledIndicator />
  </StyledRadio>
));

Radio.displayName = "Radio";
