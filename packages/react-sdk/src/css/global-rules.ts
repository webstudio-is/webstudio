import type { StyleSheetRegular } from "@webstudio-is/css-engine";
import type { Assets, FontAsset } from "@webstudio-is/sdk";
import { getFontFaces } from "@webstudio-is/fonts";

export const addGlobalRules = (
  sheet: StyleSheetRegular,
  { assets, assetBaseUrl }: { assets: Assets; assetBaseUrl: string }
) => {
  const fontAssets: FontAsset[] = [];
  for (const asset of assets.values()) {
    if (asset.type === "font") {
      fontAssets.push(asset);
    }
  }

  const fontFaces = getFontFaces(fontAssets, { assetBaseUrl });
  for (const fontFace of fontFaces) {
    sheet.addFontFaceRule(fontFace);
  }
};
