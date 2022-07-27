import React from "react";
import { styled, CSS } from "../stitches.config";
import { Flex } from "../components/flex";
import { CheckIcon } from "@webstudio-is/icons";

const StyledVerifiedBadge = styled("div", Flex, {
  alignItems: "center",
  backgroundColor: "$blue9",
  borderRadius: "$round",
  color: "white",
  flexShrink: 0,
  justifyContent: "center",
  width: "$3",
  height: "$3",
});

type VerifiedBadgeProps = React.ComponentProps<typeof StyledVerifiedBadge> & {
  css?: CSS;
};

export const VerifiedBadge = React.forwardRef<
  React.ElementRef<typeof StyledVerifiedBadge>,
  VerifiedBadgeProps
>((props, forwardedRef) => (
  <StyledVerifiedBadge {...props} ref={forwardedRef}>
    <CheckIcon />
  </StyledVerifiedBadge>
));

VerifiedBadge.displayName = "VerifiedBadge";
