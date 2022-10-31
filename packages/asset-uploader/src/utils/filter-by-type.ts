import { type FontFormat, FONT_FORMATS } from "@webstudio-is/fonts";
import type { AssetType } from "../types";

export const filterByType = <PartialAsset extends { format: string }>(
  assets: Array<PartialAsset>,
  type: AssetType
) => {
  return assets.filter(({ format }: PartialAsset) => {
    const isFont = FONT_FORMATS.has(format as FontFormat);
    if (type === "font") {
      return isFont;
    }

    return isFont === false;
  });
};
