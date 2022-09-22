import type { AssetType } from "../types";
import { FONT_FORMATS } from "../constants";

export const filterByType = <PartialAsset extends { format: string }>(
  assets: Array<PartialAsset>,
  type: AssetType
) => {
  return assets.filter(({ format }: PartialAsset) => {
    const isFont = FONT_FORMATS.includes(format as typeof FONT_FORMATS[number]);
    if (type === "font") {
      return isFont;
    }

    return isFont === false;
  });
};
