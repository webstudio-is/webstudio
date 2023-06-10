import { IconButtonWithMenu } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { iconConfigs, styleConfigByName } from "../../shared/configs";
import { toValue } from "@webstudio-is/css-engine";
import { getStyleSource, type StyleValueInfo } from "../../shared/style-info";

export const MenuControl = ({
  property,
  items: passedItems,
  styleValue,
  setProperty,
  deleteProperty,
}: Pick<
  ControlProps,
  "property" | "items" | "setProperty" | "deleteProperty"
> & {
  styleValue?: StyleValueInfo;
}) => {
  const { label, items: defaultItems } = styleConfigByName(property);
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
      const ItemIcon = iconProps[item.name];
      return { ...item, icon: ItemIcon && <ItemIcon /> };
    })
    .filter((item) => item.icon);

  return (
    <IconButtonWithMenu
      variant={styleSource}
      icon={items.find(({ name }) => name === currentValue)?.icon}
      label={label}
      items={items}
      value={String(currentValue)}
      onChange={setValue}
      onHover={(value) => setValue(value, { isEphemeral: true })}
      onReset={() => {
        deleteProperty(property);
      }}
    />
  );
};
