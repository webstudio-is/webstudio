import React from "react";
import { styled, VariantProps, CSS } from "../stitches.config";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { theme } from "../stitches.config";

const StyledThumb = styled(SwitchPrimitive.Thumb, {
  position: "absolute",
  left: 0,
  width: 13,
  height: 13,
  backgroundColor: "white",
  borderRadius: theme.borderRadius.round,
  boxShadow: "rgba(0, 0, 0, 0.3) 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px 1px 2px;",
  transition: "transform 100ms cubic-bezier(0.22, 1, 0.36, 1)",
  transform: `translateX(${theme.spacing[1]})`,
  willChange: "transform",

  '&[data-state="checked"]': {
    transform: `translateX(${theme.spacing[6]})`,
  },
});

const StyledSwitch = styled(SwitchPrimitive.Root, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  flexShrink: 0,
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },

  // Reset
  alignItems: "center",
  display: "inline-flex",
  justifyContent: "center",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",

  backgroundColor: theme.colors.slate6,
  borderRadius: theme.borderRadius.pill,
  position: "relative",
  "&:focus": {
    boxShadow: `0 0 0 2px ${theme.colors.slate8}`,
  },

  '&[data-state="checked"]': {
    backgroundColor: theme.colors.blue9,
    "&:focus": {
      boxShadow: `0 0 0 2px ${theme.colors.blue8}`,
    },
  },

  variants: {
    size: {
      "1": {
        width: theme.spacing[11],
        height: theme.spacing[9],
      },
      "2": {
        width: theme.spacing[17],
        height: theme.spacing[11],
        [`& ${StyledThumb}`]: {
          width: 21,
          height: 21,
          transform: `translateX(${theme.spacing[2]})`,
          '&[data-state="checked"]': {
            transform: `translateX(2${theme.spacing[2]})`,
          },
        },
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});

type SwitchVariants = VariantProps<typeof StyledSwitch>;
type SwitchPrimitiveProps = React.ComponentProps<typeof SwitchPrimitive.Root>;
type SwitchProps = SwitchPrimitiveProps & SwitchVariants & { css?: CSS };

export const Switch = React.forwardRef<
  React.ElementRef<typeof StyledSwitch>,
  SwitchProps
>((props, forwardedRef) => (
  <StyledSwitch {...props} ref={forwardedRef}>
    <StyledThumb />
  </StyledSwitch>
));

Switch.displayName = "Switch";
