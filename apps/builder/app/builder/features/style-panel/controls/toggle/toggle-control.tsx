import { ToggleButton } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { PropertyTooltip } from "../../shared/property-name";
import type { ControlProps } from "../types";
import { getStyleSource } from "../../shared/style-info";
import type { IconComponent } from "@webstudio-is/icons";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";

export const ToggleControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  items,
  icons,
  isAdvanced,
}: Omit<ControlProps, "items"> & {
  items: [string, string];
  icons: { [item: string]: IconComponent; default: IconComponent };
}) => {
  const { label } = styleConfigByName(property);
  const styleValue = currentStyle[property]?.value;

  if (styleValue?.type !== "keyword") {
    return;
  }

  // First item is the pressed state
  const isPressed = items[0] === styleValue.value ? true : false;
  const Icon = icons[styleValue.value] ?? icons.default;
  isAdvanced =
    isAdvanced ??
    (items[0] !== styleValue.value && items[1] !== styleValue.value);

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
              value: isPressed ? items[0] : items[1],
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
