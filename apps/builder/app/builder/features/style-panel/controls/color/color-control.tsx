import type { StyleProperty } from "@webstudio-is/css-engine";
import { ColorPicker } from "../../shared/color-picker";
import { styleConfigByName } from "../../shared/configs";
import { $availableVariables, useComputedStyleDecl } from "../../shared/model";
import { deleteProperty, setProperty } from "../../shared/use-style-data";

export const ColorControl = ({ property }: { property: StyleProperty }) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const value = computedStyleDecl.cascadedValue;
  const currentColor = computedStyleDecl.usedValue;
  const setValue = setProperty(property);
  return (
    <ColorPicker
      property={property}
      value={value}
      currentColor={currentColor}
      options={[
        ...styleConfigByName(property).items.map((item) => ({
          type: "keyword" as const,
          value: item.name,
        })),
        ...$availableVariables.get(),
      ]}
      onChange={(styleValue) => setValue(styleValue, { isEphemeral: true })}
      onChangeComplete={setValue}
      onAbort={() => deleteProperty(property, { isEphemeral: true })}
    />
  );
};
