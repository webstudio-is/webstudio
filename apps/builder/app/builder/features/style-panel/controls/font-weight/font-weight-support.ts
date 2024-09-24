import type { FontAsset } from "@webstudio-is/sdk";
import type { FontWeight } from "@webstudio-is/fonts";

// Trying to check if the font asset supports a certain weight without rendering the font and testing.
export const isExternalFontWeightSupported = (
  asset: FontAsset,
  weight: string,
  // @todo support a comma separated list instead of one
  currentFamily: string
) => {
  const { meta } = asset;
  const weightNumber = Number(weight);
  if (asset?.meta?.family !== currentFamily) {
    return false;
  }
  if ("variationAxes" in meta) {
    const { variationAxes } = meta;
    return (
      variationAxes.wght !== undefined &&
      variationAxes.wght.min <= weightNumber &&
      variationAxes.wght.max >= weightNumber
    );
  }

  return meta.weight === weightNumber;
};

// Test a font if it supports a certain weight by rendering it.
// For system fonts we can actually do it.
const testFontWeights = (fontFamily: string) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const supportedWeights: Array<FontWeight> = ["400"];

  if (context === null) {
    return supportedWeights;
  }

  const weightWidthMap: Map<FontWeight, number> = new Map();
  const fontWeights: Array<FontWeight> = [
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ];
  for (const testWeight of fontWeights) {
    context.font = `${testWeight} 16px ${fontFamily}`;
    weightWidthMap.set(
      testWeight as FontWeight,
      context.measureText("abcdefgsw1234567890").width
    );
  }

  const compare = (weights: Array<FontWeight>) => {
    const supported: Array<FontWeight> = [];
    for (let index = 0; index < weights.length; index++) {
      const referenceWeight = weights[index];
      const testWeight = weights[index + 1];
      const referenceWidth = weightWidthMap.get(referenceWeight);
      const testWidth = weightWidthMap.get(testWeight);
      // If next width is the same as the previous one, it means the weight is not supported
      if (testWeight && testWidth !== referenceWidth) {
        supported.push(testWeight);
      }
    }
    return supported;
  };

  // 400 is the baseline that's always supported, from there we test in both directions
  // each step must result in a different width to be considered supported
  // if for e.g. 400-300 is compared and has not change in width, it means 300 is not supported
  // then we can then compare 300-200 and so on.
  supportedWeights.push(...compare(["400", "300", "200", "100"]));
  supportedWeights.push(...compare(["400", "500", "600", "700", "800", "900"]));

  return supportedWeights.sort();
};

const cache = new Map<string, Array<FontWeight>>();

export const isSystemFontWeightSupported = (
  fontFamily: string,
  fontWeight: FontWeight
) => {
  let supportedWeights = cache.get(fontFamily);
  if (supportedWeights === undefined) {
    supportedWeights = testFontWeights(fontFamily);
    cache.set(fontFamily, supportedWeights);
  }
  return supportedWeights.includes(fontWeight);
};
