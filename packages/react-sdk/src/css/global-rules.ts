import type { StyleSheetRegular } from "@webstudio-is/css-engine";
import type { Assets, FontAsset } from "@webstudio-is/sdk";
import { getFontFaces } from "@webstudio-is/fonts";
import type { WsComponentMeta } from "../components/component-meta";

export const addGlobalRules = (
  sheet: StyleSheetRegular,
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

export const addPresetRules = (
  sheet: StyleSheetRegular,
  metas: Map<string, WsComponentMeta>
) => {
  sheet.addMediaRule("presets");
  for (const [component, meta] of metas) {
    for (const [tag, styles] of Object.entries(meta.presetStyle ?? {})) {
      const rule = sheet.addNestingRule(
        `${tag}:where([data-ws-component="${component}"])`
      );
      for (const declaration of styles) {
        rule.setDeclaration({
          breakpoint: "presets",
          selector: declaration.state ?? "",
          property: declaration.property,
          value: declaration.value,
        });
      }
    }
  }
};
