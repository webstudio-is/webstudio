import { CssEngine } from "@webstudio-is/css-engine";
import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";
import {
  type FontFormat,
  FONT_FORMATS,
  getFontFaces,
} from "@webstudio-is/fonts";

export const addGlobalRules = (
  engine: CssEngine,
  { assets = [] }: { assets?: Array<Asset> }
) => {
  // @todo we need to figure out all global resets while keeping
  // the engine aware of all of them.
  // Ideally, the user is somehow aware and in control of the reset
  engine.addPlaintextRule("html {margin: 0; height: 100%}");

  const fontAssets = assets.filter((asset) =>
    FONT_FORMATS.has(asset.format as FontFormat)
  ) as Array<FontAsset>;
  const fontFaces = getFontFaces(fontAssets);
  for (const fontFace of fontFaces) {
    engine.addFontFaceRule(fontFace);
  }
};
