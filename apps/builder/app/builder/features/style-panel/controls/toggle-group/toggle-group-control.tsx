import {
  Flex,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { getStyleSource } from "../../shared/style-info";
import { useState } from "react";
import { PropertyTooltip } from "../../shared/property-name";
import { toValue } from "@webstudio-is/css-engine";
import type { ControlProps } from "..";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";

export type ToggleGroupControlProps = Omit<ControlProps, "items"> & {
  value?: string;
  items: {
    child: JSX.Element;
    title: string;
    description: string;
    value: string;
    propertyValues: string | string[];
  }[];
  isAdvanced?: boolean;
};

export const ToggleGroupControl = ({
  currentStyle,
  property,
  items = [],
  setProperty,
  deleteProperty,
  value,
  isAdvanced,
}: ToggleGroupControlProps) => {
  const styleSource = getStyleSource(currentStyle[property]);
  const currentValue = value ?? toValue(currentStyle[property]?.value);

  // Issue: The tooltip's grace area is too big and overlaps with nearby buttons,
  // preventing the tooltip from changing when the buttons are hovered over in certain cases.
  // To solve issue and allow tooltips to change on button hover,
  // we close the button tooltip in the ToggleGroupButton.onMouseEnter handler.
  // onMouseEnter used to preserve default hovering behavior on tooltip.
  const [openTootips, setOpenTooltips] = useState(() =>
    Array.from(items, () => false)
  );

  isAdvanced =
    isAdvanced ?? items.some((item) => item.value === currentValue) === false;

  return (
    <AdvancedValueTooltip
      isAdvanced={isAdvanced}
      property={property}
      value={currentValue}
      currentStyle={currentStyle}
      deleteProperty={deleteProperty}
    >
      <ToggleGroup
        color={styleSource}
        type="single"
        value={currentValue}
        onValueChange={(value) => {
          setProperty(property)({ type: "keyword", value });
        }}
        css={{ width: "fit-content" }}
      >
        {items.map((item, index) => {
          const scrollableContent = Array.isArray(item.propertyValues)
            ? item.propertyValues.map((propertyValue) => (
                <div key={propertyValue}>{propertyValue}</div>
              ))
            : item.propertyValues;
          const handleReset = () => {
            if (item.value === currentValue) {
              deleteProperty(property);
            }
          };
          return (
            <PropertyTooltip
              key={item.value}
              open={openTootips[index]}
              onOpenChange={(open) => {
                setOpenTooltips((openTooltips) => {
                  const newOpenTooltips = [...openTooltips];
                  newOpenTooltips[index] = open;
                  return newOpenTooltips;
                });
              }}
              title={item.title}
              scrollableContent={scrollableContent}
              description={item.description}
              properties={item.value === currentValue ? [property] : []}
              style={currentStyle}
              onReset={handleReset}
            >
              <ToggleGroupButton
                disabled={isAdvanced}
                onMouseEnter={() => {
                  setOpenTooltips((openTooltips) => {
                    return openTooltips.map((openTooltip, i) =>
                      i !== index ? false : openTooltip
                    );
                  });
                }}
                value={item.value}
                onClick={(event) => {
                  if (event.altKey) {
                    handleReset();
                  }
                }}
              >
                <Flex>{item.child}</Flex>
              </ToggleGroupButton>
            </PropertyTooltip>
          );
        })}
      </ToggleGroup>
    </AdvancedValueTooltip>
  );
};
