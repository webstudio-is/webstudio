import { Select, Text } from "@webstudio-is/design-system";
import {
  type FontWeight,
  fontWeightNames,
  fontWeights,
} from "@webstudio-is/fonts";
import { toValue } from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { useAssets, type AssetContainer } from "~/builder/shared/assets";
import {
  isExternalFontWeightSupported,
  isSystemFontWeightSupported,
} from "./font-weight-support";
import { useComputedStyles } from "../../shared/model";
import { setProperty } from "../../shared/use-style-data";
import { canvasApi } from "~/shared/canvas-api";

const allFontWeights = Object.keys(fontWeights) as Array<FontWeight>;

const labels = new Map(
  allFontWeights.map((weight) => [
    weight,
    `${weight} - ${fontWeights[weight as FontWeight].label}`,
  ])
);

// Find all font weights that are available for the current font family.
const getSupportedFontWeights = (
  currentFamily: string,
  assetContainers: Array<AssetContainer>
) => {
  const found = allFontWeights.filter((weight) => {
    return canvasApi.isSystemFontWeightSupported(currentFamily, weight);
  });
  return new Map(found.map((weight) => [weight, true]));
};

export const FontWeightControl = () => {
  // We need the font family to determine which font weights are available
  const [fontWeight, fontFamily] = useComputedStyles([
    "fontWeight",
    "fontFamily",
  ]);
  const { assetContainers } = useAssets("font");
  const fontFamilyCss = toValue(fontFamily.cascadedValue);
  const fontWeightCss = toValue(fontWeight.cascadedValue);

  const supportedFontWeights = useMemo(
    () => getSupportedFontWeights(fontFamilyCss, assetContainers),
    [fontFamilyCss, assetContainers]
  );
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
          <Text color={supportedFontWeights.get(weight) ? "main" : "subtle"}>
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
