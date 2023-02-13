import {
  styled,
  Tooltip,
  useEnhancedTooltipProps,
} from "@webstudio-is/design-system";
import type { SpaceStyleProperty } from "./types";
import { useDebounce } from "use-debounce";
import { useState } from "react";

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

export const SpaceTooltip = ({
  property,
}: {
  property: SpaceStyleProperty;
}) => {
  const { delayDuration } = useEnhancedTooltipProps();
  const [initialOpen, setInitialOpen] = useState(false);
  const [open] = useDebounce(initialOpen, delayDuration ?? 0);

  if (initialOpen === false) {
    setInitialOpen(true);
  }

  return (
    <Tooltip
      open={open}
      content={labels[property]}
      side={sides[property]}
      disableHoverableContent
    >
      <Trigger />
    </Tooltip>
  );
};
