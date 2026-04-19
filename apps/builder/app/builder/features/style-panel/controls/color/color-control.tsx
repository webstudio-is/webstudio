import type { CssProperty } from "@webstudio-is/css-engine";
import { keywordValues } from "@webstudio-is/css-data";
import { ColorPickerControl } from "../../shared/color-picker";
import {
  $availableColorVariables,
  useComputedStyleDecl,
} from "../../shared/model";
import { deleteProperty, setProperty } from "../../shared/use-style-data";
import { useReadonly } from "../../shared/readonly";

export const ColorControl = ({ property }: { property: CssProperty }) => {
  const readonly = useReadonly();
  const computedStyleDecl = useComputedStyleDecl(property);
  const value = computedStyleDecl.cascadedValue;
  const usedColor = computedStyleDecl.usedValue;
  // When the alpha channel is an unresolved CSS variable (substituteVars couldn't
  // resolve it to a number), use the var's fallback value if available, otherwise
  // fall back to fully opaque so the color picker always receives a number.
  const currentColor =
    usedColor.type === "color" && typeof usedColor.alpha !== "number"
      ? {
          ...usedColor,
          alpha:
            usedColor.alpha.fallback?.type === "unit"
              ? usedColor.alpha.fallback.value
              : 1,
        }
      : usedColor;
  const setValue = setProperty(property);
  return (
    <ColorPickerControl
      disabled={readonly}
      property={property}
      value={value}
      currentColor={currentColor}
      getOptions={() => [
        ...(keywordValues[property] ?? []).map((item) => ({
          type: "keyword" as const,
          value: item,
        })),
        ...$availableColorVariables.get(),
      ]}
      onChange={(styleValue) => setValue(styleValue, { isEphemeral: true })}
      onChangeComplete={setValue}
      onAbort={() => deleteProperty(property, { isEphemeral: true })}
      onReset={() => deleteProperty(property)}
    />
  );
};
