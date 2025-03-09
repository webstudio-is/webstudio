import { useState, type ReactElement } from "react";
import { deleteProperty } from "../../shared/use-style-data";
import { Tooltip } from "@webstudio-is/design-system";
import { PropertyInfo } from "../../property-label";
import { useComputedStyles } from "../../shared/model";
import type { SpaceStyleProperty } from "./properties";

const sides = {
  "padding-top": "top",
  "padding-right": "top",
  "padding-bottom": "bottom",
  "padding-left": "left",
  "margin-top": "top",
  "margin-right": "left",
  "margin-bottom": "bottom",
  "margin-left": "right",
} as const;

const propertyContents: {
  properties: SpaceStyleProperty[];
  label: string;
  description: string;
}[] = [
  // Padding
  {
    properties: ["padding-top", "padding-bottom"],
    label: "Vertical Padding",
    description:
      "Defines the space between the content of an element and its top and bottom border. Can affect layout height.",
  },

  {
    properties: ["padding-left", "padding-right"],
    label: "Horizontal Padding",
    description:
      "Defines the space between the content of an element and its left and right border. Can affect layout width.",
  },

  {
    properties: [
      "padding-top",
      "padding-bottom",
      "padding-left",
      "padding-right",
    ],
    label: "Padding",
    description:
      "Defines the space between the content of an element and its border. Can affect layout size.",
  },
  // Margin
  {
    properties: ["margin-top", "margin-bottom"],
    label: "Vertical Margin",
    description: "Sets the margin at the top and bottom of an element.",
  },

  {
    properties: ["margin-left", "margin-right"],
    label: "Horizontal Margin",
    description: "Sets the margin at the left and right of an element.",
  },

  {
    properties: ["margin-top", "margin-bottom", "margin-left", "margin-right"],
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
  children,
  preventOpen,
}: {
  property: SpaceStyleProperty;
  children: ReactElement;
  preventOpen: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const properties = [property];
  const styles = useComputedStyles(properties);

  const propertyContent = propertyContents.find((propertyContent) =>
    isSameUnorderedArrays(propertyContent.properties, properties)
  );

  const handleOpenChange = (value: boolean) => {
    if (preventOpen && value === true) {
      return;
    }
    setIsOpen(value);
  };

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={handleOpenChange}
      side={sides[property]}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          if (event.altKey) {
            event.preventDefault();
            deleteProperty(property);
            return;
          }
        },
      }}
      content={
        <PropertyInfo
          title={propertyContent?.label ?? ""}
          description={propertyContent?.description}
          styles={styles}
          onReset={() => {
            deleteProperty(property);
            handleOpenChange(false);
          }}
        />
      }
    >
      {/* @todo show tooltip on focus */}
      <div>{children}</div>
    </Tooltip>
  );
};
