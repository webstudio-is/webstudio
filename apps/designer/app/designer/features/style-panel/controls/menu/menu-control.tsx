import { IconButtonWithMenu } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import type { ControlProps } from "../../style-sections";
import { iconConfigs } from "../../shared/configs";
import { toValue } from "@webstudio-is/css-engine";

export const MenuControl = ({
  property,
  currentStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const value = currentStyle[property];
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
            toValue(currentStyle.flexDirection) === "column"
              ? 90 * (property === "alignItems" ? -1 : 1)
              : 0
          }deg)`,
        };
  const items = styleConfig.items
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
      label={styleConfig.label}
      items={items}
      value={String(currentValue)}
      isActive={isFromCurrentBreakpoint}
      onChange={setValue}
      onHover={(value) => setValue(value, { isEphemeral: true })}
    />
  );
};
