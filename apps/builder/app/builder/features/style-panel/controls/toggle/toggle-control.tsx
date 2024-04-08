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

export type ToggleGroupControlProps = Omit<ControlProps, "items"> & {
  value?: string;
  items: {
    child: JSX.Element;
    title: string;
    description: string;
    value: string;
    propertyValues: string | string[];
  }[];
};

export const ToggleGroupControl = ({
  currentStyle,
  property,
  items = [],
  disabled,
  setProperty,
  deleteProperty,
  value,
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

  return (
    <ToggleGroup
      color={styleSource}
      type="single"
      value={currentValue}
      onValueChange={(value) => {
        setProperty(property)({ type: "keyword", value });
      }}
      css={{ width: "fit-content" }}
    >
      {items.map(
        (
          { child, title, value: itemValue, description, propertyValues },
          index
        ) => {
          const scrollableContent = Array.isArray(propertyValues)
            ? propertyValues.map((propertyValue) => (
                <div key={propertyValue}>{propertyValue}</div>
              ))
            : propertyValues;
          const handleReset = () => {
            if (itemValue === currentValue) {
              deleteProperty(property);
            }
          };
          return (
            <PropertyTooltip
              key={itemValue}
              open={openTootips[index]}
              onOpenChange={(open) => {
                setOpenTooltips((openTooltips) => {
                  const newOpenTooltips = [...openTooltips];
                  newOpenTooltips[index] = open;
                  return newOpenTooltips;
                });
              }}
              title={title}
              scrollableContent={scrollableContent}
              description={description}
              properties={itemValue === currentValue ? [property] : []}
              style={currentStyle}
              onReset={handleReset}
            >
              <ToggleGroupButton
                disabled={disabled}
                onMouseEnter={(event) => {
                  setOpenTooltips((openTooltips) => {
                    return openTooltips.map((openTooltip, i) =>
                      i !== index ? false : openTooltip
                    );
                  });
                }}
                value={itemValue}
                onClick={(event) => {
                  if (event.altKey) {
                    handleReset();
                  }
                }}
              >
                <Flex>{child}</Flex>
              </ToggleGroupButton>
            </PropertyTooltip>
          );
        }
      )}
    </ToggleGroup>
  );
};
