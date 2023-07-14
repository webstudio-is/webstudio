import {
  Flex,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import type { StyleInfo, StyleSource } from "../../shared/style-info";
import { useState, type ReactElement } from "react";
import { PropertyTooltip } from "../../shared/property-name";
import type { StyleProperty } from "@webstudio-is/css-data";

export type ToggleGroupControlProps = {
  style: StyleInfo;
  styleSource?: StyleSource;
  value: string;
  items: {
    child: JSX.Element;
    title: string;
    description: string;
    value: string;
    propertyValues: string | string[];
  }[];
  onValueChange?: (value: string) => void;
  onReset?: () => void;
  properties?: StyleProperty[] | undefined;
};

const ToggleGroupButtonWithTooltip = ({
  title,
  propertyValues,
  description,
  children,
  value,
  onReset,
  tooltipOpen,
  onTooltipOpenChange,
  onMouseEnter,
  style,
  properties,
}: {
  title: string;
  value: string;
  propertyValues: string | string[];
  description: React.ReactNode;
  children: ReactElement;
  onReset?: () => void;
  tooltipOpen: boolean;
  onTooltipOpenChange: (open: boolean) => void;
  onMouseEnter: (event: React.MouseEvent<HTMLButtonElement>) => void;
  style: StyleInfo;
  properties?: StyleProperty[] | undefined;
}) => {
  const scrollableContent = Array.isArray(propertyValues)
    ? propertyValues.map((propertyValue) => (
        <div key={propertyValue}>{propertyValue}</div>
      ))
    : propertyValues;

  return (
    <PropertyTooltip
      open={tooltipOpen}
      onOpenChange={onTooltipOpenChange}
      title={title}
      scrollableContent={scrollableContent}
      description={description}
      properties={properties ?? []}
      style={style}
      onReset={onReset}
    >
      <ToggleGroupButton
        onMouseEnter={onMouseEnter}
        value={value}
        onClick={(event) => {
          if (event.altKey) {
            onReset?.();
          }
        }}
      >
        <Flex>{children}</Flex>
      </ToggleGroupButton>
    </PropertyTooltip>
  );
};

// @todo refactor this control to follow the standard interface we otherwise have for all controls
export const ToggleGroupControl = ({
  styleSource,
  value = "",
  items = [],
  onValueChange,
  onReset,
  style,
  properties,
}: ToggleGroupControlProps) => {
  // Issue: The tooltip's grace area is too big and overlaps with nearby buttons,
  // preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // To solve issue and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseEnter handler.
  // onMouseEnter used to preserve default hovering behavior on tooltip.
  const [openTootips, setOpenTooltips] = useState(() =>
    Array.from(items, () => false)
  );

  return (
    <ToggleGroup
      color={styleSource}
      type="single"
      value={value}
      onValueChange={onValueChange}
      css={{ width: "fit-content" }}
    >
      {items.map(
        (
          { child, title, value: itemValue, description, propertyValues },
          index
        ) => {
          return (
            <ToggleGroupButtonWithTooltip
              key={index}
              style={style}
              title={title}
              propertyValues={propertyValues}
              properties={itemValue === value ? properties : []}
              description={description}
              value={itemValue}
              onReset={itemValue === value ? onReset : undefined}
              tooltipOpen={openTootips[index]}
              onTooltipOpenChange={(open) => {
                setOpenTooltips((openTooltips) => {
                  const newOpenTooltips = [...openTooltips];
                  newOpenTooltips[index] = open;
                  return newOpenTooltips;
                });
              }}
              onMouseEnter={(event) => {
                setOpenTooltips((openTooltips) => {
                  return openTooltips.map((openTooltip, i) =>
                    i !== index ? false : openTooltip
                  );
                });
              }}
            >
              {child}
            </ToggleGroupButtonWithTooltip>
          );
        }
      )}
    </ToggleGroup>
  );
};
