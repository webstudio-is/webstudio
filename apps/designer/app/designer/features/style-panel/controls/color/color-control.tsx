import { Flex } from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import type { ControlProps } from "../../style-sections";
import { ColorPicker } from "../../shared/color-picker";

export const ColorControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  if (value === undefined) {
    return null;
  }
  const setValue = setProperty(styleConfig.property);

  return (
    <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
      <ColorPicker
        id={styleConfig.property}
        value={String(value.value)}
        onChange={(value) => {
          setValue(value, { isEphemeral: true });
        }}
        onChangeComplete={setValue}
      />
    </Flex>
  );
};
