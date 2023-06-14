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
  // Layout source https://twitter.com/ChallengesCss/status/1471128244720181258
  engine.addPlaintextRule("html {margin: 0; display: grid; min-height: 100%}");

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
