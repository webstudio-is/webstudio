import type {
  StyleSheetAtomic,
  StyleSheetRegular,
} from "@webstudio-is/css-engine";
import type { Assets, FontAsset } from "@webstudio-is/sdk";
import { getFontFaces } from "@webstudio-is/fonts";

export const addGlobalRules = (
  sheet: StyleSheetRegular | StyleSheetAtomic,
  { assets, assetBaseUrl }: { assets: Assets; assetBaseUrl: string }
) => {
  // @todo we need to figure out all global resets while keeping
  // the engine aware of all of them.
  // Ideally, the user is somehow aware and in control of the reset
  // Layout source https://twitter.com/ChallengesCss/status/1471128244720181258
  sheet.addPlaintextRule("html {margin: 0; display: grid; min-height: 100%}");

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
