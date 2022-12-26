import { Flex } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { ControlProps } from "../../style-sections";
import { ColorPicker } from "../../shared/color-picker";
import { colord } from "colord";

export const ColorControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  let value = currentStyle[property] ?? {
    // provide default value to avoid control hiding
    // when value is recomputed
    type: "rgb" as const,
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  };

  const setValue = setProperty(property);

  if (value.type !== "rgb") {
    // Support previously set colors
    const colordValue = colord(toValue(value));

    if (colordValue.isValid()) {
      const rgb = colordValue.toRgb();
      value = {
        type: "rgb",
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        alpha: rgb.a ?? 1,
      };
    } else {
      // @todo what to show as default?
      // Default to black
      value = {
        type: "rgb",
        r: 0,
        g: 0,
        b: 0,
        alpha: 1,
      };
    }
  }

  return (
    <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
      <ColorPicker
        id={property}
        value={value}
        onChange={(value) => {
          setValue(value, { isEphemeral: true });
        }}
        onChangeComplete={setValue}
      />
    </Flex>
  );
};
