import {
  createRegularStyleSheet,
  type TransformValue,
} from "@webstudio-is/css-engine";
import type {
  Asset,
  Assets,
  Breakpoint,
  Instance,
  StyleDecl,
  StyleDeclKey,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import type { WsComponentMeta } from "../components/component-meta";
import { idAttribute } from "../props";
import { addGlobalRules } from "./global-rules";
import { getPresetStyleRules, getStyleRules } from "./style-rules";
import { createAtomicStyleSheet } from "@webstudio-is/css-engine";

type Data = {
  assets: Asset[];
  breakpoints: [Breakpoint["id"], Breakpoint][];
  styles: [StyleDeclKey, StyleDecl][];
  styleSourceSelections: [Instance["id"], StyleSourceSelection][];
  componentMetas: Map<string, WsComponentMeta>;
};

type CssOptions = {
  assetBaseUrl: string;
};

export const createImageValueTransformer =
  (assets: Assets, options: CssOptions): TransformValue =>
  (styleValue) => {
    if (styleValue.type === "image" && styleValue.value.type === "asset") {
      const asset = assets.get(styleValue.value.value);
      if (asset === undefined) {
        return { type: "keyword", value: "none" };
      }

      // @todo reuse image loaders and generate image-set
      const { assetBaseUrl } = options;
      const url = `${assetBaseUrl}${asset.name}`;

      return {
        type: "image",
        value: {
          type: "url",
          url,
        },
        hidden: styleValue.hidden,
      };
    }
  };

export const generateCss = (data: Data, options: CssOptions) => {
  const assets: Assets = new Map(data.assets.map((asset) => [asset.id, asset]));
  const breakpoints = new Map(data.breakpoints);
  const styles = new Map(data.styles);
  const styleSourceSelections = new Map(data.styleSourceSelections);
  const classMap: Map<string, Array<string>> = new Map();

  const globalSheet = createRegularStyleSheet({ name: "ssr-global" });
  // @todo add support for both regular and atomic style sheets
  //const sheet = createRegularStyleSheet({ name: "ssr" });
  const atomicSheet = createAtomicStyleSheet({ name: "ssr" });

  addGlobalRules(globalSheet, {
    assets,
    assetBaseUrl: options.assetBaseUrl,
  });

  for (const breakpoint of breakpoints.values()) {
    atomicSheet.addMediaRule(breakpoint.id, breakpoint);
  }

  for (const [component, meta] of data.componentMetas) {
    const presetStyle = meta.presetStyle;
    if (presetStyle === undefined) {
      continue;
    }
    const rules = getPresetStyleRules(component, presetStyle);
    for (const [selector, style] of rules) {
      globalSheet.addStyleRule(selector, { style });
    }
  }

  const styleRules = getStyleRules(styles, styleSourceSelections);
  for (const { breakpointId, instanceId, state, style } of styleRules) {
    const transformer = createImageValueTransformer(assets, options);
    const styleRule = {
      breakpoint: breakpointId,
      style,
    };
    // @todo add support for both regular and atomic style sheets
    //sheet.addStyleRule(
    //  `[${idAttribute}="${instanceId}"]${state ?? ""}`,
    //  styleRule,
    //  transformer
    //);
    const { classes } = atomicSheet.addStyleRule(styleRule, transformer);
    classMap.set(instanceId, classes);
  }
  return { cssText: globalSheet.cssText + atomicSheet.cssText, classMap };
};
