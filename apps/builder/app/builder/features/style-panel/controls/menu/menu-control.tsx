import { toValue } from "@webstudio-is/css-engine";
import type { IconComponent } from "@webstudio-is/icons";
import {
  Box,
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
  IconButton,
  theme,
} from "@webstudio-is/design-system";
import type { ControlProps } from "../types";
import { getStyleSource } from "../../shared/style-info";
import { PropertyTooltip } from "../../shared/property-name";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";
import { toKebabCase } from "../../shared/keyword-utils";
import { useState } from "react";
import { declarationDescriptions } from "@webstudio-is/css-data";

export const MenuControl = ({
  currentStyle,
  property,
  items,
  setProperty,
  deleteProperty,
  isAdvanced,
}: Omit<ControlProps, "items"> & {
  items: Array<{
    name: string;
    label: string;
    icon: IconComponent;
  }>;
}) => {
  const styleValue = currentStyle[property];
  const value = styleValue?.value;
  const styleSource = getStyleSource(styleValue);
  const [descriptionValue, setDescriptionValue] = useState<string>();

  if (value === undefined) {
    return;
  }

  const setValue = setProperty(property);
  const currentValue = toValue(value);
  const currentItem = items.find((item) => item.name === currentValue);
  const Icon = currentItem?.icon ?? items[0].icon;
  const description =
    declarationDescriptions[
      `${property}:${
        descriptionValue ?? currentValue
      }` as keyof typeof declarationDescriptions
    ];
  // If there is no icon, we can't represent the value visually and assume the value comes from advanced section.
  isAdvanced = isAdvanced ?? currentItem === undefined;

  return (
    <DropdownMenu modal={false}>
      <AdvancedValueTooltip
        isAdvanced={isAdvanced}
        property={property}
        value={currentValue}
        currentStyle={currentStyle}
        deleteProperty={deleteProperty}
      >
        <PropertyTooltip
          title={currentItem?.label}
          properties={[property]}
          scrollableContent={`${toKebabCase(property)}: ${currentValue};`}
          style={currentStyle}
          onReset={() => deleteProperty(property)}
        >
          <DropdownMenuTrigger asChild>
            <IconButton
              disabled={isAdvanced}
              variant={styleSource}
              onPointerDown={(event) => {
                // tooltip reset property when click with altKey
                if (event.altKey) {
                  event.preventDefault();
                }
              }}
            >
              <Icon />
            </IconButton>
          </DropdownMenuTrigger>
        </PropertyTooltip>
      </AdvancedValueTooltip>
      <DropdownMenuPortal>
        <DropdownMenuContent sideOffset={4} collisionPadding={16} side="bottom">
          <DropdownMenuRadioGroup
            value={currentValue}
            onValueChange={(value) => setValue({ type: "keyword", value })}
          >
            {items.map(({ name, label, icon: Icon }) => {
              return (
                <DropdownMenuRadioItem
                  text="sentence"
                  key={name}
                  value={name}
                  onFocus={() => {
                    setValue(
                      { type: "keyword", value: name },
                      { isEphemeral: true }
                    );
                    setDescriptionValue(name);
                  }}
                  onBlur={() => {
                    setValue(
                      { type: "keyword", value: currentValue },
                      { isEphemeral: true }
                    );
                    setDescriptionValue(undefined);
                  }}
                >
                  <Flex
                    css={{
                      width: theme.spacing[11],
                      height: theme.spacing[11],
                    }}
                    align="center"
                    justify="center"
                  >
                    <Icon />
                  </Flex>
                  {label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem hint>
            <Box css={{ width: theme.spacing[25] }}>{description}</Box>
          </DropdownMenuItem>
          <DropdownMenuArrow />
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
