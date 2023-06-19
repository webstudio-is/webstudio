import { Select } from "@webstudio-is/design-system";
import { type FontWeight, fontWeights } from "@webstudio-is/fonts";
import { toValue } from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { useAssets } from "~/builder/shared/assets";
import type { ControlProps } from "../../style-sections";
import { isSupportedFontWeight } from "./is-supported-font-weight";

type FontWeightItem = {
  label: string;
  weight: FontWeight;
};

const allFontWeights: Array<FontWeightItem> = (
  Object.keys(fontWeights) as Array<FontWeight>
).map((weight) => ({
  label: `${fontWeights[weight].label} (${weight})`,
  weight,
}));

// All font weights for the current family
const useAvailableFontWeights = (
  currentFamily: string
): Array<FontWeightItem> => {
  const { assetContainers } = useAssets("font");

  // Find all font weights that are available for the current font family.
  return useMemo(() => {
    const found = allFontWeights.filter((option) => {
      return assetContainers.find((assetContainer) => {
        if (
          assetContainer.status !== "uploaded" ||
          assetContainer.asset.type !== "font"
        ) {
          return false;
        }
        return isSupportedFontWeight(
          assetContainer.asset,
          option.weight,
          currentFamily
        );
      });
    });
    return found.length === 0 ? allFontWeights : found;
  }, [currentFamily, assetContainers]);
};

const useLabels = (
  availableFontWeights: Array<FontWeightItem>,
  currentWeight: string
) => {
  // support named aliases
  if (currentWeight === "normal") {
    currentWeight = "400";
  }
  if (currentWeight === "bold") {
    currentWeight = "700";
  }
  const labels = useMemo(
    () => availableFontWeights.map((option) => option.label),
    [availableFontWeights]
  );

  const selectedLabel = useMemo(() => {
    const selectedOption =
      availableFontWeights.find((option) => option.weight === currentWeight) ??
      // In case available weights a custom font supports does not include the current weight,
      // we show the first available weight.
      availableFontWeights[0];
    return selectedOption?.label;
  }, [currentWeight, availableFontWeights]);

  return { labels, selectedLabel };
};

export const FontWeightControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const fontWeight = currentStyle[property]?.value;

  // We need the font family to determine which font weights are available
  const fontFamily = currentStyle.fontFamily?.value;

  const availableFontWeights = useAvailableFontWeights(
    toValue(fontFamily, (styleValue) => {
      // override default fallback with rendering only first font family
      if (styleValue.type === "fontFamily") {
        return {
          type: "fontFamily",
          value: [styleValue.value[0]],
        };
      }
    })
  );
  const { labels, selectedLabel } = useLabels(
    availableFontWeights,
    toValue(fontWeight)
  );

  const setValue = setProperty(property);

  return (
    <Select
      // show empty field instead of radix placeholder
      // like css value input does
      placeholder=""
      options={labels}
      // We use a weight as a value, because there are only 9 weights and they are unique.
      value={selectedLabel}
      onChange={(label) => {
        const selected = availableFontWeights.find(
          (option) => option.label === label
        );
        if (selected) {
          setValue({ type: "keyword", value: selected.weight });
        }
      }}
    />
  );
};
