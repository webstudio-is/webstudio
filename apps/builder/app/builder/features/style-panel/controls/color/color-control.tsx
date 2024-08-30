import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { Flex } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { ColorPicker } from "../../shared/color-picker";
import { styleConfigByName } from "../../shared/configs";
import type { ControlProps } from "../types";
import { AdvancedValueTooltip } from "../advanced-value-tooltip";
import { createComputedStyleDeclStore } from "../../shared/model";

export const ColorControl = ({
  property,
  items,
  currentStyle,
  setProperty,
  deleteProperty,
  isAdvanced,
}: ControlProps) => {
  const $computedStyleDecl = useMemo(
    () => createComputedStyleDeclStore(property),
    [property]
  );
  const computedStyleDecl = useStore($computedStyleDecl);

  const { items: defaultItems } = styleConfigByName(property);

  const setValue = setProperty(property);

  const value = computedStyleDecl.cascadedValue;
  const currentColor = computedStyleDecl.usedValue;

  return (
    <Flex align="center" gap="1">
      <AdvancedValueTooltip
        isAdvanced={isAdvanced}
        property={property}
        value={toValue(currentColor)}
        currentStyle={currentStyle}
        deleteProperty={deleteProperty}
      >
        <ColorPicker
          disabled={isAdvanced}
          currentColor={currentColor}
          property={property}
          value={value}
          keywords={(items ?? defaultItems).map((item) => ({
            type: "keyword",
            value: item.name,
          }))}
          onChange={(styleValue) => setValue(styleValue, { isEphemeral: true })}
          onChangeComplete={setValue}
          onAbort={() => deleteProperty(property, { isEphemeral: true })}
        />
      </AdvancedValueTooltip>
    </Flex>
  );
};
