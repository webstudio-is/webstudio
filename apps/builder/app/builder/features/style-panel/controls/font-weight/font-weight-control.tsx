import { Select, Text } from "@webstudio-is/design-system";
import {
  type FontWeight,
  fontWeightNames,
  fontWeights,
} from "@webstudio-is/fonts";
import { toValue } from "@webstudio-is/css-engine";
import { useEffect } from "react";
import { useComputedStyles } from "../../shared/model";
import { setProperty } from "../../shared/use-style-data";
import { canvasApi } from "~/shared/canvas-api";
import { useStore } from "@nanostores/react";
import { $detectedFontsWeights } from "~/shared/nano-states";

const allFontWeights = Object.keys(fontWeights) as Array<FontWeight>;

const labels = new Map(
  allFontWeights.map((weight) => [
    weight,
    `${weight} - ${fontWeights[weight as FontWeight].label}`,
  ])
);

export const FontWeightControl = () => {
  // We need the font family to determine which font weights are available
  const [fontWeight, fontFamily] = useComputedStyles([
    "fontWeight",
    "fontFamily",
  ]);
  const detectedFontsWeights = useStore($detectedFontsWeights);
  const fontFamilyCss = toValue(fontFamily.usedValue);
  const fontWeightCss = toValue(fontWeight.cascadedValue);
  const supportedFontWeights = detectedFontsWeights.get(fontFamilyCss) ?? [];

  useEffect(() => {
    canvasApi.detectSupportedFontWeights(fontFamilyCss);
  }, [fontFamilyCss]);

  const selectedWeight =
    fontWeightNames.get(fontWeightCss) ?? (fontWeightCss as FontWeight);

  const setValue = setProperty("fontWeight");

  const setFontWeight = (
    nextWeight: FontWeight,
    options?: { isEphemeral: boolean }
  ) => {
    setValue({ type: "keyword", value: nextWeight }, options);
  };

  return (
    <Select
      // show empty field instead of radix placeholder
      // like css value input does
      placeholder=""
      options={allFontWeights}
      getLabel={(weight: FontWeight) => {
        return (
          <Text
            color={supportedFontWeights.includes(weight) ? "main" : "subtle"}
          >
            {labels.get(weight)}
          </Text>
        );
      }}
      // We use a weight as a value, because there are only 9 weights and they are unique.
      value={selectedWeight}
      onChange={setFontWeight}
      onItemHighlight={(nextWeight) => {
        // Remove preview when mouse leaves the item.
        if (nextWeight === undefined) {
          if (fontWeight !== undefined) {
            setValue(fontWeight.cascadedValue, { isEphemeral: true });
          }
          return;
        }
        // Preview on mouse enter or focus.
        setFontWeight(nextWeight, { isEphemeral: true });
      }}
      onOpenChange={(isOpen) => {
        // Remove ephemeral changes when closing the menu.
        if (isOpen === false && fontWeight !== undefined) {
          setValue(fontWeight.cascadedValue, { isEphemeral: true });
        }
      }}
    />
  );
};
