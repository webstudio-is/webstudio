import type { SpaceStyleProperty } from "./types";
import { PropertyTooltip } from "../../shared/property-name";
import type { StyleInfo } from "../../shared/style-info";
import { useState, type ReactElement } from "react";
import { useModifierKeys } from "../../shared/modifier-keys";
import { getModifiersGroup } from "./scrub";
import type { CreateBatchUpdate } from "../../shared/use-style-data";

const sides = {
  paddingTop: "top",
  paddingRight: "top",
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

const isSameUnorderedArrays = (
  arrA: readonly string[],
  arrB: readonly string[]
) => {
  if (arrA.length !== arrB.length) {
    return false;
  }

  const union = new Set([...arrA, ...arrB]);
  return union.size === arrA.length;
};

export const SpaceTooltip = ({
  property,
  style,
  children,
  createBatchUpdate,
  preventOpen,
}: {
  property: SpaceStyleProperty;
  style: StyleInfo;
  children: ReactElement;
  createBatchUpdate: CreateBatchUpdate;
  preventOpen: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const modifiers = useModifierKeys();

  const properties = [...getModifiersGroup(property, modifiers)];

  const propertyContent = propertyContents.find((propertyContent) =>
    isSameUnorderedArrays(propertyContent.properties, properties)
  );

  const handleOpenChange = (value: boolean) => {
    if (preventOpen && value === true) {
      return;
    }
    setOpen(value);
  };

  return (
    <PropertyTooltip
      open={open}
      onOpenChange={handleOpenChange}
      properties={properties}
      style={style}
      title={propertyContent?.label}
      description={propertyContent?.description}
      side={sides[property]}
      onReset={() => {
        const batch = createBatchUpdate();
        for (const property of properties) {
          batch.deleteProperty(property);
        }
        batch.publish();
      }}
    >
      <div>{children}</div>
    </PropertyTooltip>
  );
};
