import {
  hyphenateProperty,
  type CssProperty,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { keywordValues } from "@webstudio-is/css-data";
import { ColorPicker } from "../../shared/color-picker";
import {
  $availableColorVariables,
  useComputedStyleDecl,
} from "../../shared/model";
import { deleteProperty, setProperty } from "../../shared/use-style-data";

export const ColorControl = ({
  property,
}: {
  property: StyleProperty | CssProperty;
}) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const value = computedStyleDecl.cascadedValue;
  const currentColor = computedStyleDecl.usedValue;
  const setValue = setProperty(property);
  return (
    <ColorPicker
      property={property}
      value={value}
      currentColor={currentColor}
      getOptions={() => [
        ...(keywordValues[hyphenateProperty(property)] ?? []).map((item) => ({
          type: "keyword" as const,
          value: item,
        })),
        ...$availableColorVariables.get(),
      ]}
      onChange={(styleValue) => setValue(styleValue, { isEphemeral: true })}
      onChangeComplete={setValue}
      onAbort={() => deleteProperty(property, { isEphemeral: true })}
      onReset={() => {
        deleteProperty(property);
      }}
    />
  );
};
