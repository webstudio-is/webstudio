import { ToggleButton } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { PropertyTooltip } from "../../shared/property-name";
import type { ControlProps } from "../types";
import { getStyleSource } from "../../shared/style-info";
import type { IconComponent } from "@webstudio-is/icons";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";

type Item = {
  isPressed: boolean;
  Icon: IconComponent;
  value: string;
};

export const ToggleControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  items,
  DefaultIcon,
  isAdvanced,
}: Omit<ControlProps, "items"> & {
  items: [Item, Item];
  DefaultIcon?: IconComponent;
}) => {
  const { label } = styleConfigByName(property);
  const styleValue = currentStyle[property]?.value;

  if (styleValue?.type !== "keyword") {
    return;
  }
  const currentItem =
    items[0].value === styleValue.value
      ? items[0]
      : items[1].value === styleValue.value
      ? items[1]
      : undefined;

  const isPressed = currentItem?.isPressed ?? false;
  const Icon = currentItem?.Icon ?? DefaultIcon;
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
              value:
                items[0].isPressed === isPressed
                  ? items[0].value
                  : items[1].value,
            });
          }}
          variant={getStyleSource(currentStyle[property])}
        >
          {Icon ? <Icon /> : <></>}
        </ToggleButton>
      </PropertyTooltip>
    </AdvancedValueTooltip>
  );
};
