import {
  createRegularStyleSheet,
  createAtomicStyleSheet,
  type TransformValue,
} from "@webstudio-is/css-engine";
import type {
  Assets,
  Breakpoints,
  StyleDecl,
  StyleSource,
  StyleSourceSelections,
  Styles,
} from "@webstudio-is/sdk";
import type { WsComponentMeta } from "../components/component-meta";
import { idAttribute } from "../props";
import { addGlobalRules } from "./global-rules";
import { getPresetStyleRules, getStyleRules } from "./style-rules";

export type CssConfig = {
  assets: Assets;
  breakpoints: Breakpoints;
  styles: Styles;
  styleSourceSelections: StyleSourceSelections;
  componentMetas: Map<string, WsComponentMeta>;
  assetBaseUrl: string;
  atomic: boolean;
};

export const createImageValueTransformer =
  (
    assets: Assets,
    { assetBaseUrl }: { assetBaseUrl: string }
  ): TransformValue =>
  (styleValue) => {
    if (styleValue.type === "image" && styleValue.value.type === "asset") {
      const asset = assets.get(styleValue.value.value);
      if (asset === undefined) {
        return { type: "keyword", value: "none" };
      }

      // @todo reuse image loaders and generate image-set
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

export const generateCss = ({
  assets,
  breakpoints,
  styles,
  styleSourceSelections,
  componentMetas,
  assetBaseUrl,
  atomic,
}: CssConfig) => {
  const classesMap = new Map<string, Array<string>>();

  const regularSheet = createRegularStyleSheet({ name: "ssr-regular" });
  const atomicSheet = atomic
    ? createAtomicStyleSheet({ name: "ssr-atomic" })
    : undefined;

  addGlobalRules(regularSheet, { assets, assetBaseUrl });

  for (const breakpoint of breakpoints.values()) {
    (atomicSheet ?? regularSheet).addMediaRule(breakpoint.id, breakpoint);
  }

  for (const [component, meta] of componentMetas) {
    const presetStyle = meta.presetStyle;
    if (presetStyle === undefined) {
      continue;
    }
    const rules = getPresetStyleRules(component, presetStyle);
    for (const [selector, style] of rules) {
      regularSheet.addStyleRule({ style }, selector);
    }
  }

  const styleRules = getStyleRules(styles, styleSourceSelections);

  const imageValueTransformer = createImageValueTransformer(assets, {
    assetBaseUrl,
  });
  regularSheet.setTransformer(imageValueTransformer);
  atomicSheet?.setTransformer(imageValueTransformer);

  if (atomicSheet) {
    for (const { breakpointId, instanceId, state, style } of styleRules) {
      const { classes } = atomicSheet.addStyleRule(
        { breakpoint: breakpointId, style },
        state,
        imageValueTransformer
      );
      classesMap.set(instanceId, [
        ...(classesMap.get(instanceId) ?? []),
        ...classes,
      ]);
    }

    return {
      cssText: regularSheet.cssText + (atomicSheet?.cssText ?? ""),
      classesMap,
    };
  }

  // @todo write declarations into mixins instead of map
  const stylesByStyleSourceId = new Map<StyleSource["id"], StyleDecl[]>();
  for (const styleDecl of styles.values()) {
    const { styleSourceId } = styleDecl;
    let styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
    if (styleSourceStyles === undefined) {
      styleSourceStyles = [];
      stylesByStyleSourceId.set(styleSourceId, styleSourceStyles);
    }
    styleSourceStyles.push(styleDecl);
  }

  for (const { instanceId, values } of styleSourceSelections.values()) {
    const rule = regularSheet.addNestingRule(
      `[${idAttribute}="${instanceId}"]`
    );
    for (const styleSourceId of values) {
      const styles = stylesByStyleSourceId.get(styleSourceId);
      if (styles === undefined) {
        continue;
      }
      for (const { breakpointId, state, property, value } of styles) {
        rule.setDeclaration({
          breakpoint: breakpointId,
          selector: state ?? "",
          property,
          value,
        });
      }
    }
  }

  return {
    cssText: regularSheet.cssText,
    classesMap,
  };
};
