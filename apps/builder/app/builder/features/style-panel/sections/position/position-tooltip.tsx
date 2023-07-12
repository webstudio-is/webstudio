import { PropertyTooltip } from "../../shared/property-name";
import type { StyleInfo } from "../../shared/style-info";
import { useState, type ReactElement } from "react";
import { useModifierKeys } from "../../shared/modifier-keys";
import { getPositionModifiersGroup } from "../shared/scrub";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import type { PositionProperty } from "./position-layout";

const sides = {
  top: "top",
  right: "left",
  bottom: "bottom",
  left: "left",
} as const;

const propertyContents: {
  properties: PositionProperty[];
  label: string;
  description: string;
}[] = [
  {
    properties: ["top", "bottom"],
    label: "Vertical position",
    description:
      "Sets the top and bottom position of an element relative to its nearest positioned ancestor.",
  },

  {
    properties: ["left", "right"],
    label: "Horizontal position",
    description:
      "Sets the left and right position of an element relative to its nearest positioned ancestor.",
  },

  {
    properties: ["top", "right", "bottom", "left"],
    label: "Padding",
    description:
      "Sets the top, right, bottom and left position of an element relative to its nearest positioned ancestor.",
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

export const PositionTooltip = ({
  property,
  style,
  children,
  createBatchUpdate,
  preventOpen,
}: {
  property: PositionProperty;
  style: StyleInfo;
  children: ReactElement;
  createBatchUpdate: CreateBatchUpdate;
  preventOpen: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const modifiers = useModifierKeys();

  const properties = [...getPositionModifiersGroup(property, modifiers)];

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
