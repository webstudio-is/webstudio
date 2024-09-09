import { Select } from "@webstudio-is/design-system";
import { type FontWeight, fontWeights } from "@webstudio-is/fonts";
import { toValue } from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { useAssets } from "~/builder/shared/assets";
import { isSupportedFontWeight } from "./is-supported-font-weight";
import { useComputedStyles } from "../../shared/model";
import { setProperty } from "../../shared/use-style-data";

type FontWeightItem = {
  label: string;
  weight: FontWeight;
};

const allFontWeights: Array<FontWeightItem> = (
  Object.keys(fontWeights) as Array<FontWeight>
).map((weight) => ({
  label: `${weight} - ${fontWeights[weight].label}`,
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

export const FontWeightControl = () => {
  // We need the font family to determine which font weights are available
  const [fontWeight, fontFamily] = useComputedStyles([
    "fontWeight",
    "fontFamily",
  ]);

  const availableFontWeights = useAvailableFontWeights(
    toValue(fontFamily.cascadedValue, (styleValue) => {
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
    toValue(fontWeight.cascadedValue)
  );

  const setValue = setProperty("fontWeight");

  const setFontWeight = (label: string, options?: { isEphemeral: boolean }) => {
    const selected = availableFontWeights.find(
      (option) => option.label === label
    );
    if (selected) {
      setValue({ type: "keyword", value: selected.weight }, options);
    }
  };

  return (
    <Select
      // show empty field instead of radix placeholder
      // like css value input does
      placeholder=""
      options={labels}
      // We use a weight as a value, because there are only 9 weights and they are unique.
      value={selectedLabel}
      onChange={setFontWeight}
      onItemHighlight={(label) => {
        // Remove preview when mouse leaves the item.
        if (label === undefined) {
          if (fontWeight !== undefined) {
            setValue(fontWeight.cascadedValue, { isEphemeral: true });
          }
          return;
        }
        // Preview on mouse enter or focus.
        setFontWeight(label, { isEphemeral: true });
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
