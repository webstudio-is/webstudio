import { styled, useEnhancedTooltipProps } from "@webstudio-is/design-system";
import type { SpaceStyleProperty } from "./types";
import { useDebounce } from "use-debounce";
import { useState } from "react";
import { PropertyTooltip } from "../../shared/property-name";
import type { StyleInfo } from "../../shared/style-info";

// trigger is used only for positioning
const PositionTrigger = styled("div", {
  position: "absolute",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  top: 0,
  left: 0,
});

const sides = {
  paddingTop: "top",
  paddingRight: "left",
  paddingBottom: "bottom",
  paddingLeft: "left",
  marginTop: "top",
  marginRight: "left",
  marginBottom: "bottom",
  marginLeft: "right",
} as const;

const propertyContents: {
  properties: SpaceStyleProperty[];
  label: string;
  description: string;
}[] = [
  // Padding
  {
    properties: ["paddingTop", "paddingBottom"],
    label: "Vertical Padding",
    description:
      "Defines the space between the content of an element and its top and bottom border. Can affect layout height.",
  },

  {
    properties: ["paddingLeft", "paddingRight"],
    label: "Horizontal Padding",
    description:
      "Defines the space between the content of an element and its left and right border. Can affect layout width.",
  },

  {
    properties: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"],
    label: "Padding",
    description:
      "Defines the space between the content of an element and its border. Can affect layout size.",
  },
  // Margin
  {
    properties: ["marginTop", "marginBottom"],
    label: "Vertical Margin",
    description: "Sets the margin at the top and bottom of an element.",
  },

  {
    properties: ["marginLeft", "marginRight"],
    label: "Horizontal Margin",
    description: "Sets the margin at the left and right of an element.",
  },

  {
    properties: ["marginTop", "marginBottom", "marginLeft", "marginRight"],
    label: "Margin",
    description: "Sets the margin of an element.",
  },
];

const isSameUnorderedArrays = (arrA: string[], arrB: string[]) => {
  if (arrA.length !== arrB.length) {
    return false;
  }

  const union = new Set([...arrA, ...arrB]);
  return union.size === arrA.length;
};

export const SpaceTooltip = ({
  property,
  properties,
  style,
}: {
  property: SpaceStyleProperty;
  properties: SpaceStyleProperty[];
  style: StyleInfo;
}) => {
  const { delayDuration } = useEnhancedTooltipProps();
  const [initialOpen, setInitialOpen] = useState(false);
  const [open] = useDebounce(initialOpen, delayDuration ?? 0);

  if (initialOpen === false) {
    setInitialOpen(true);
  }
  const propertyContent = propertyContents.find((propertyContent) =>
    isSameUnorderedArrays(propertyContent.properties, properties)
  );

  return (
    <PropertyTooltip
      properties={properties}
      style={style}
      title={propertyContent?.label}
      description={propertyContent?.description}
      open={open}
      side={sides[property]}
    >
      <PositionTrigger />
    </PropertyTooltip>
  );
};
