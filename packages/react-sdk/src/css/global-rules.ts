import type { CssEngine } from "@webstudio-is/css-engine";
import type { Assets, FontAsset } from "@webstudio-is/asset-uploader";
import { getFontFaces } from "@webstudio-is/fonts";

export const addGlobalRules = (
  engine: CssEngine,
  { assets, assetBaseUrl }: { assets: Assets; assetBaseUrl: string }
) => {
  // @todo we need to figure out all global resets while keeping
  // the engine aware of all of them.
  // Ideally, the user is somehow aware and in control of the reset
  engine.addPlaintextRule("html {margin: 0; height: 100%}");

  const fontAssets: FontAsset[] = [];
  for (const asset of assets.values()) {
    if (asset?.type === "font") {
      fontAssets.push(asset);
    }
  }

  const fontFaces = getFontFaces(fontAssets, { assetBaseUrl });
  for (const fontFace of fontFaces) {
    engine.addFontFaceRule(fontFace);
  }
};
