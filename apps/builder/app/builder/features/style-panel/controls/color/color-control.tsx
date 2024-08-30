import type { StyleProperty } from "@webstudio-is/css-engine";
import { ColorPicker } from "../../shared/color-picker";
import { styleConfigByName } from "../../shared/configs";
import { useComputedStyleDecl } from "../../shared/model";
import { deleteProperty, setProperty } from "../../shared/use-style-data";

export const ColorControl = ({ property }: { property: StyleProperty }) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const { items } = styleConfigByName(property);
  const value = computedStyleDecl.cascadedValue;
  const currentColor = computedStyleDecl.usedValue;
  const setValue = setProperty(property);
  return (
    <ColorPicker
      property={property}
      value={value}
      currentColor={currentColor}
      keywords={items.map((item) => ({ type: "keyword", value: item.name }))}
      onChange={(styleValue) => setValue(styleValue, { isEphemeral: true })}
      onChangeComplete={setValue}
      onAbort={() => deleteProperty(property, { isEphemeral: true })}
    />
  );
};
