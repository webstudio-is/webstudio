import { FONT_FORMATS } from "@webstudio-is/fonts";
import type { AssetType } from "../types";

export const filterByType = <PartialAsset extends { format: string }>(
  assets: Array<PartialAsset>,
  type: AssetType
) => {
  return assets.filter(({ format }: PartialAsset) => {
    const isFont = format in FONT_FORMATS;
    if (type === "font") {
      return isFont;
    }

    return isFont === false;
  });
};
