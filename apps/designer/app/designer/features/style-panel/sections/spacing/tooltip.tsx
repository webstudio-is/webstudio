import { styled, Tooltip } from "@webstudio-is/design-system";
import { SpacingStyleProperty } from "./types";

// trigger is used only for positioning
const Trigger = styled("div", {
  position: "absolute",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  top: 0,
  left: 0,
});

const labels = {
  paddingTop: "Padding Top",
  paddingRight: "Padding Right",
  paddingBottom: "Padding Bottom",
  paddingLeft: "Padding Left",
  marginTop: "Margin Top",
  marginRight: "Margin Right",
  marginBottom: "Margin Bottom",
  marginLeft: "Margin Left",
};

const sides = {
  paddingTop: "top",
  paddingRight: "left",
  paddingBottom: "top",
  paddingLeft: "right",
  marginTop: "top",
  marginRight: "left",
  marginBottom: "top",
  marginLeft: "right",
} as const;

export const SpacingTooltip = ({
  property,
  isOpen,
}: {
  property: SpacingStyleProperty;
  isOpen: boolean;
}) => (
  <Tooltip
    open={isOpen}
    content={labels[property]}
    side={sides[property]}
    disableHoverableContent
  >
    <Trigger />
  </Tooltip>
);
