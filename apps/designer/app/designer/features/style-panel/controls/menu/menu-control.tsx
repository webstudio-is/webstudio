import { IconButtonWithMenu } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import type { ControlProps } from "../../style-sections";
import { iconConfigs, styleConfigByName } from "../../shared/configs";
import { toValue } from "@webstudio-is/css-engine";

export const MenuControl = ({
  property,
  items: passedItems,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const { label, items: defaultItems } = styleConfigByName[property];
  const value = currentStyle[property]?.value;
  const isFromCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

  if (value === undefined) {
    return null;
  }

  const setValue = setProperty(property);
  const currentValue = toValue(value);

  const iconProps = iconConfigs[property];
  const iconStyle =
    property === "flexDirection"
      ? {}
      : {
          transform: `rotate(${
            toValue(currentStyle.flexDirection?.value) === "column"
              ? 90 * (property === "alignItems" ? -1 : 1)
              : 0
          }deg)`,
        };
  const items = (passedItems ?? defaultItems)
    .map((item) => {
      const ItemIcon = iconProps[item.name];
      return {
        ...item,
        icon: ItemIcon && <ItemIcon style={iconStyle} />,
      };
    })
    .filter((item) => item.icon);
  return (
    <IconButtonWithMenu
      icon={items.find(({ name }) => name === currentValue)?.icon}
      label={label}
      items={items}
      value={String(currentValue)}
      isActive={isFromCurrentBreakpoint}
      onChange={setValue}
      onHover={(value) => setValue(value, { isEphemeral: true })}
    />
  );
};
