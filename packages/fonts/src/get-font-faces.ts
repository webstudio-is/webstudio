import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";
import { FONT_FORMATS } from "./constants";

export const getFontFaces = (assets: Array<Asset>) => {
  const fontAssets = assets.filter(
    (asset) => asset.format in FONT_FORMATS
  ) as Array<FontAsset>;

  return fontAssets.map((asset) => {
    return {
      fontFamily: asset.meta.family,
      fontStyle: asset.meta.style,
      fontWeight: asset.meta.weight,
      fontDisplay: "swap" as const,
      src: `url('${asset.path}') format('${FONT_FORMATS[asset.format]}')`,
    };
  });
};
