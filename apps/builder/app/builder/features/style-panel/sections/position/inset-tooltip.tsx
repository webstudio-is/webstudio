import { useState, type ReactElement } from "react";
import { Tooltip } from "@webstudio-is/design-system";
import type { CssProperty } from "@webstudio-is/css-engine";
import { useModifierKeys } from "../../shared/modifier-keys";
import { createBatchUpdate } from "../../shared/use-style-data";
import type { InsetProperty } from "./inset-layout";
import { PropertyInfo } from "../../property-label";
import { useComputedStyles } from "../../shared/model";

const opposingInsetGroups = [
  ["top", "bottom"],
  ["left", "right"],
] satisfies CssProperty[][];

const circleInsetGroups = [
  ["top", "right", "bottom", "left"],
] satisfies CssProperty[][];

export const getInsetModifiersGroup = (
  property: CssProperty,
  modifiers: { shiftKey: boolean; altKey: boolean }
) => {
  let groups: CssProperty[][] = [];

  if (modifiers.shiftKey) {
    groups = circleInsetGroups;
  } else if (modifiers.altKey) {
    groups = opposingInsetGroups;
  }

  return groups.find((group) => group.includes(property)) ?? [property];
};

const sides = {
  top: "top",
  right: "left",
  bottom: "bottom",
  left: "left",
} as const;

const propertyContents: {
  properties: CssProperty[];
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
    label: "Inset position",
    description:
      "Sets the top, right, bottom and left position of an element relative to its nearest positioned ancestor.",
  },
];

const isSameUnorderedArrays = <Item,>(
  arrA: readonly Item[],
  arrB: readonly Item[]
) => {
  if (arrA.length !== arrB.length) {
    return false;
  }

  const union = new Set([...arrA, ...arrB]);
  return union.size === arrA.length;
};

export const InsetTooltip = ({
  property,
  children,
  preventOpen,
}: {
  property: InsetProperty;
  children: ReactElement;
  preventOpen: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const modifiers = useModifierKeys();

  const properties = [...getInsetModifiersGroup(property, modifiers)];
  const styles = useComputedStyles(properties);

  const resetProperties = () => {
    const batch = createBatchUpdate();
    for (const property of properties) {
      batch.deleteProperty(property);
    }
    batch.publish();
  };

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
            resetProperties();
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
            resetProperties();
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
