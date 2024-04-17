import { ToggleButton } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { PropertyTooltip } from "../../shared/property-name";
import type { ControlProps } from "../types";
import { getStyleSource } from "../../shared/style-info";
import type { IconComponent } from "@webstudio-is/icons";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";
import { toKebabCase } from "../../shared/keyword-utils";

type Item = {
  name: string;
  label: string;
  icon: IconComponent;
};

export const ToggleControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  items,
  isAdvanced,
}: Omit<ControlProps, "items"> & {
  items: [Item, Item];
}) => {
  const { label } = styleConfigByName(property);
  const styleValue = currentStyle[property]?.value;

  if (styleValue?.type !== "keyword") {
    return;
  }

  // First item is the pressed state
  const isPressed = items[0].name === styleValue.value ? true : false;
  const currentItem = items.find((item) => item.name === styleValue.value);
  const Icon = currentItem?.icon ?? items[0].icon;
  isAdvanced = isAdvanced ?? currentItem === undefined;

  return (
    <AdvancedValueTooltip
      isAdvanced={isAdvanced}
      property={property}
      value={styleValue.value}
      currentStyle={currentStyle}
      deleteProperty={deleteProperty}
    >
      <PropertyTooltip
        title={label}
        scrollableContent={`${toKebabCase(property)}: ${styleValue.value};`}
        properties={[property]}
        style={currentStyle}
        onReset={() => deleteProperty(property)}
      >
        <ToggleButton
          disabled={isAdvanced}
          pressed={isPressed}
          onPressedChange={(isPressed) => {
            setProperty(property)({
              type: "keyword",
              value: isPressed ? items[0].name : items[1].name,
            });
          }}
          variant={getStyleSource(currentStyle[property])}
        >
          <Icon />
        </ToggleButton>
      </PropertyTooltip>
    </AdvancedValueTooltip>
  );
};
