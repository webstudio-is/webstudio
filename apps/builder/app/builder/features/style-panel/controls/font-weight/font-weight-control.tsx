import { Flex, Select, Text } from "@webstudio-is/design-system";
import { type FontWeight, fontWeights } from "@webstudio-is/fonts";
import { toValue } from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { useAssets } from "~/builder/shared/assets";
import {
  isExternalFontWeightSupported,
  isSystemFontWeightSupported,
} from "./font-weight-support";
import { useComputedStyles } from "../../shared/model";
import { setProperty } from "../../shared/use-style-data";
import { AlertIcon, WrapIcon } from "@webstudio-is/icons";

type FontWeightItem = {
  label: string;
  weight: FontWeight;
  isSupported?: boolean;
};

const allFontWeights = Object.keys(fontWeights) as Array<FontWeight>;

const labels = new Map(
  allFontWeights.map((weight) => [
    weight,
    `${weight} - ${fontWeights[weight as FontWeight].label}`,
  ])
);

// All font weights for the current family
const useSupportedFontWeights = (currentFamily: string) => {
  const { assetContainers } = useAssets("font");

  // Find all font weights that are available for the current font family.
  return useMemo(() => {
    const found = allFontWeights.filter((weight) => {
      return (
        assetContainers.find((assetContainer) => {
          if (
            assetContainer.status !== "uploaded" ||
            assetContainer.asset.type !== "font"
          ) {
            return false;
          }
          return isExternalFontWeightSupported(
            assetContainer.asset,
            weight,
            currentFamily
          );
        }) || isSystemFontWeightSupported(currentFamily, weight)
      );
    });
    return new Map(
      found.map((weight) => {
        return [weight, true];
      })
    );
  }, [currentFamily, assetContainers]);
};

const useLabels = (
  supportedFontWeights: Array<FontWeight>,
  currentWeight: string
) => {
  // support named aliases
  if (currentWeight === "normal") {
    currentWeight = "400";
  }
  if (currentWeight === "bold") {
    currentWeight = "700";
  }

  const selectedWeight = useMemo(() => {
    return (
      supportedFontWeights.find((weight) => weight === currentWeight) ??
      // In case available weights a custom font supports does not include the current weight,
      // we show the first available weight.
      supportedFontWeights[0]
    );
  }, [currentWeight, supportedFontWeights]);

  return { selectedWeight };
};

export const FontWeightControl = () => {
  // We need the font family to determine which font weights are available
  const [fontWeight, fontFamily] = useComputedStyles([
    "fontWeight",
    "fontFamily",
  ]);

  const supportedFontWeights = useSupportedFontWeights(
    toValue(fontFamily.cascadedValue)
  );
  const { selectedWeight } = useLabels(
    supportedFontWeights,
    toValue(fontWeight.cascadedValue)
  );

  const setValue = setProperty("fontWeight");

  const setFontWeight = (
    nextWeight: FontWeight,
    options?: { isEphemeral: boolean }
  ) => {
    const selected = supportedFontWeights.find(
      (weight) => weight === nextWeight
    );
    if (selected) {
      setValue({ type: "keyword", value: selected }, options);
    }
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
