import type { FontAsset } from "@webstudio-is/sdk";

export const isSupportedFontWeight = (
  asset: FontAsset,
  weight: string,
  currentFamily: string
) => {
  if (asset?.meta?.family !== currentFamily) {
    return false;
  }

  const { meta } = asset;
  const weightNumber = Number(weight);

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
