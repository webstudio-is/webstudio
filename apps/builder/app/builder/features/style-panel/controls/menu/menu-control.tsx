import { useState } from "react";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import type { IconComponent } from "@webstudio-is/icons";
import {
  Box,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
  IconButton,
  MenuCheckedIcon,
  theme,
} from "@webstudio-is/design-system";
import { declarationDescriptions } from "@webstudio-is/css-data";
import { humanizeString } from "~/shared/string-utils";
import { setProperty } from "../../shared/use-style-data";
import { useComputedStyleDecl } from "../../shared/model";
import { PropertyValueTooltip } from "../../property-label";

export const MenuControl = ({
  property,
  items,
}: {
  property: StyleProperty;
  items: Array<{
    name: string;
    label: string;
    icon: IconComponent;
  }>;
}) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const [descriptionValue, setDescriptionValue] = useState<string>();

  const setValue = setProperty(property);
  const currentValue = toValue(computedStyleDecl.cascadedValue);
  const currentItem = items.find((item) => item.name === currentValue);
  const Icon = currentItem?.icon ?? items[0].icon;
  const description =
    declarationDescriptions[
      `${property}:${
        descriptionValue ?? currentValue
      }` as keyof typeof declarationDescriptions
    ];
  // consider defined (not default) value as advanced
  // when there is no matching item
  const isAdvanced =
    computedStyleDecl.source.name !== "default" && currentItem === undefined;

  return (
    <DropdownMenu modal={false}>
      <PropertyValueTooltip
        label={currentItem?.label ?? humanizeString(property)}
        description={description}
        properties={[property]}
        isAdvanced={isAdvanced}
      >
        <DropdownMenuTrigger asChild>
          <IconButton
            aria-disabled={isAdvanced}
            variant={computedStyleDecl.source.name}
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
      </PropertyValueTooltip>
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
                  icon={<MenuCheckedIcon />}
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
                  <Flex gap="1">
                    <Flex
                      css={{
                        width: theme.spacing[9],
                        height: theme.spacing[9],
                      }}
                      align="center"
                      justify="center"
                    >
                      <Icon />
                    </Flex>
                    {label}
                  </Flex>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem hint>
            <Box css={{ width: theme.spacing[25] }}>{description}</Box>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
