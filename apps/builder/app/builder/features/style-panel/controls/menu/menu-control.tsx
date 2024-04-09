import { toValue } from "@webstudio-is/css-engine";
import type { IconComponent, IconRecord } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Flex,
  IconButton,
  theme,
} from "@webstudio-is/design-system";
import type { ControlProps } from "../types";
import { iconConfigs, styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";
import { PropertyTooltip } from "../../shared/property-name";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";

export const MenuControl = ({
  currentStyle,
  property,
  icons,
  DefaultIcon,
  items: passedItems,
  setProperty,
  deleteProperty,
  isAdvanced,
}: ControlProps & { icons?: IconRecord; DefaultIcon?: IconComponent }) => {
  const { label, items: defaultItems } = styleConfigByName(property);
  const styleValue = currentStyle[property];
  const value = styleValue?.value;
  const styleSource = getStyleSource(styleValue);

  if (value === undefined) {
    return;
  }

  const setValue = setProperty(property);
  const currentValue = toValue(value);

  const iconProps = iconConfigs[property];

  const items = (passedItems ?? defaultItems)
    .map((item) => {
      const ItemIcon = icons?.[item.name] ?? iconProps?.[item.name];
      return { ...item, icon: ItemIcon && <ItemIcon /> };
    })
    .filter((item) => item.icon);
  const icon = items.find(({ name }) => name === currentValue)?.icon;
  // If there is no icon, we can't represent the value visually and assume the value comes from advanced section.
  isAdvanced = isAdvanced ?? icon === undefined;
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
          title={label}
          properties={[property]}
          style={currentStyle}
          onReset={() => deleteProperty(property)}
        >
          <DropdownMenuTrigger asChild>
            <IconButton
              disabled={isAdvanced ?? icon === undefined}
              variant={styleSource}
              onPointerDown={(event) => {
                // tooltip reset property when click with altKey
                if (event.altKey) {
                  event.preventDefault();
                }
              }}
            >
              {icon ?? (DefaultIcon ? <DefaultIcon /> : <></>)}
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
            {items.map(({ name, label, icon }) => {
              return (
                <DropdownMenuRadioItem
                  text="sentence"
                  key={name}
                  value={label}
                  onFocus={() =>
                    setValue(
                      { type: "keyword", value: name },
                      { isEphemeral: true }
                    )
                  }
                  onBlur={() =>
                    setValue(
                      { type: "keyword", value: currentValue },
                      { isEphemeral: true }
                    )
                  }
                >
                  <Flex
                    css={{
                      width: theme.spacing[11],
                      height: theme.spacing[11],
                    }}
                    align="center"
                    justify="center"
                  >
                    {icon}
                  </Flex>
                  {label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
          <DropdownMenuArrow />
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
