import { toValue } from "@webstudio-is/css-engine";
import type { IconRecord } from "@webstudio-is/icons";
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
import type { ControlProps } from "../../style-sections";
import { iconConfigs, styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";
import { PropertyTooltip } from "../../shared/property-name";

export const MenuControl = ({
  currentStyle,
  property,
  icons,
  items: passedItems,
  setProperty,
  deleteProperty,
}: Pick<
  ControlProps,
  "currentStyle" | "property" | "items" | "setProperty" | "deleteProperty"
> & { icons?: IconRecord }) => {
  const { label, items: defaultItems } = styleConfigByName(property);
  const styleValue = currentStyle[property];
  const value = styleValue?.value;
  const styleSource = getStyleSource(styleValue);

  if (value === undefined) {
    return null;
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

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div>
          <PropertyTooltip
            title={label}
            properties={[property]}
            style={currentStyle}
            onReset={() => deleteProperty(property)}
          >
            <IconButton
              variant={styleSource}
              onPointerDown={(event) => {
                // tooltip reset property when click with altKey
                if (event.altKey) {
                  event.preventDefault();
                }
              }}
            >
              {items.find(({ name }) => name === currentValue)?.icon ?? <></>}
            </IconButton>
          </PropertyTooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent sideOffset={4} collisionPadding={16} side="bottom">
          <DropdownMenuRadioGroup
            value={currentValue}
            onValueChange={(value) => setValue({ type: "keyword", value })}
          >
            {items.map(({ name, label, icon }) => {
              return (
                <DropdownMenuRadioItem
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
