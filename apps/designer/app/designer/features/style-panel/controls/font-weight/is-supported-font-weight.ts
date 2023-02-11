import type { Asset } from "@webstudio-is/asset-uploader";

export const isSupportedFontWeight = (
  asset: Asset,
  weight: string,
  currentFamily: string
) => {
  const isCurrentFamily =
    "meta" in asset &&
    "family" in asset.meta &&
    asset.meta.family === currentFamily;

  if (isCurrentFamily === false) {
    return false;
  }

  const weightNumber = Number(weight);
  const { meta } = asset;

  if ("variationAxes" in meta) {
    const { variationAxes } = meta;
    return (
      variationAxes.wght !== undefined &&
      variationAxes.wght.min <= weightNumber &&
      variationAxes.wght.max >= weightNumber
    );
  }

  return "weight" in meta && meta.weight === weightNumber;
};
