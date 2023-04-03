import type { CssEngine } from "@webstudio-is/css-engine";
import type { Assets, FontAsset } from "@webstudio-is/asset-uploader";
import {
  type FontFormat,
  FONT_FORMATS,
  getFontFaces,
} from "@webstudio-is/fonts";

export const addGlobalRules = (
  engine: CssEngine,
  { assets }: { assets: Assets }
) => {
  // @todo we need to figure out all global resets while keeping
  // the engine aware of all of them.
  // Ideally, the user is somehow aware and in control of the reset
  engine.addPlaintextRule("html {margin: 0; height: 100%}");

  const fontAssets: Array<FontAsset> = [];
  for (const asset of assets.values()) {
    if (asset && FONT_FORMATS.has(asset.format as FontFormat)) {
      fontAssets.push(asset as FontAsset);
    }
  }

  const fontFaces = getFontFaces(fontAssets);
  for (const fontFace of fontFaces) {
    engine.addFontFaceRule(fontFace);
  }
};
