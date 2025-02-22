import { kebabCase } from "change-case";
import {
  createRegularStyleSheet,
  generateAtomic,
  type NestingRule,
  type StyleSheetRegular,
  type TransformValue,
} from "@webstudio-is/css-engine";
import { getFontFaces } from "@webstudio-is/fonts";
import type { Assets, FontAsset } from "./schema/assets";
import type { Instance, Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import type { Breakpoints } from "./schema/breakpoints";
import type { Styles } from "./schema/styles";
import type { StyleSourceSelections } from "./schema/style-source-selections";
import type { WsComponentMeta } from "./schema/component-meta";
import { createScope } from "./scope";
import { parseComponentName, ROOT_INSTANCE_ID } from "./instances-utils";
import { descendantComponent, rootComponent } from "./core-metas";

export const addFontRules = ({
  sheet,
  assets,
  assetBaseUrl,
}: {
  sheet: StyleSheetRegular;
  assets: Assets;
  assetBaseUrl: string;
}) => {
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

export type CssConfig = {
  assets: Assets;
  instances: Instances;
  props: Props;
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

const normalizeClassName = (name: string) => kebabCase(name);

export const generateCss = ({
  assets,
  instances,
  props,
  breakpoints,
  styles,
  styleSourceSelections,
  componentMetas,
  assetBaseUrl,
  atomic,
}: CssConfig) => {
  const fontSheet = createRegularStyleSheet({ name: "ssr" });
  const presetSheet = createRegularStyleSheet({ name: "ssr" });
  const userSheet = createRegularStyleSheet({ name: "ssr" });

  addFontRules({ sheet: fontSheet, assets, assetBaseUrl });
  presetSheet.addMediaRule("presets");
  const presetClasses = new Map<Instance["component"], string>();
  const scope = createScope([], normalizeClassName, "-");
  for (const [component, meta] of componentMetas) {
    const [_namespace, componentName] = parseComponentName(component);
    const className = `w-${scope.getName(component, meta.label ?? componentName)}`;
    const presetStyle = Object.entries(meta.presetStyle ?? {});
    if (presetStyle.length > 0) {
      // add preset class only when at least one style is defined
      presetClasses.set(component, className);
    }
    // @todo reset specificity with css cascade layers instead of :where
    for (const [tag, styles] of presetStyle) {
      // use :where() to reset specificity of preset selector
      // and let user styles completely override it
      // ideally switch to @layer when better supported
      // render root preset styles without changes
      const selector =
        component === rootComponent ? ":root" : `${tag}.${className}`;
      const rule = presetSheet.addNestingRule(selector);
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

  for (const breakpoint of breakpoints.values()) {
    userSheet.addMediaRule(breakpoint.id, breakpoint);
  }

  const imageValueTransformer = createImageValueTransformer(assets, {
    assetBaseUrl,
  });
  userSheet.setTransformer(imageValueTransformer);

  for (const styleDecl of styles.values()) {
    const rule = userSheet.addMixinRule(styleDecl.styleSourceId);
    rule.setDeclaration({
      breakpoint: styleDecl.breakpointId,
      selector: styleDecl.state ?? "",
      property: styleDecl.property,
      value: styleDecl.value,
    });
  }

  const classes = new Map<Instance["id"], string[]>();
  const parentIdByInstanceId = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    const presetClass = presetClasses.get(instance.component);
    if (presetClass) {
      classes.set(instance.id, [presetClass]);
    }
    for (const child of instance.children) {
      if (child.type === "id") {
        parentIdByInstanceId.set(child.value, instance.id);
      }
    }
  }

  const descendantSelectorByInstanceId = new Map<Instance["id"], string>();
  for (const prop of props.values()) {
    if (prop.name === "selector" && prop.type === "string") {
      descendantSelectorByInstanceId.set(prop.instanceId, prop.value);
    }
  }

  const instanceByRule = new Map<NestingRule, Instance["id"]>();
  for (const selection of styleSourceSelections.values()) {
    let { instanceId } = selection;
    const { values } = selection;
    // special case for :root styles
    if (instanceId === ROOT_INSTANCE_ID) {
      const rule = userSheet.addNestingRule(`:root`);
      rule.applyMixins(values);
      // avoid storing in instanceByRule to prevent conversion into atomic styles
      continue;
    }
    let descendantSuffix = "";
    // render selector component as descendant selector
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    if (instance.component === descendantComponent) {
      const parentId = parentIdByInstanceId.get(instanceId);
      const descendantSelector = descendantSelectorByInstanceId.get(instanceId);
      if (parentId && descendantSelector) {
        descendantSuffix = descendantSelector;
        instanceId = parentId;
      }
    }
    const meta = componentMetas.get(instance.component);
    const [_namespace, shortName] = parseComponentName(instance.component);
    const baseName = instance.label ?? meta?.label ?? shortName;
    const className = `w-${scope.getName(instanceId, baseName)}`;
    if (atomic === false) {
      let classList = classes.get(instanceId);
      if (classList === undefined) {
        classList = [];
        classes.set(instanceId, classList);
      }
      classList.push(className);
    }
    const rule = userSheet.addNestingRule(`.${className}`, descendantSuffix);
    rule.applyMixins(values);
    instanceByRule.set(rule, instanceId);
  }

  const fontCss = fontSheet.cssText;
  // render presets inside of cascade layer to let user completely override all properties
  // user agent (browser) styles work in the same way
  // for example a { color: black } overrides a:visited as well
  // @todo figure out proper API to work with layers when more use cases are known
  const presetCss = presetSheet.cssText.replaceAll(
    "@media all ",
    "@layer presets "
  );

  if (atomic) {
    const { cssText } = generateAtomic(userSheet, {
      getKey: (rule) => instanceByRule.get(rule),
      transformValue: imageValueTransformer,
      classes,
    });
    return {
      cssText: `${fontCss}${presetCss}\n${cssText}`,
      classes,
    };
  }
  return {
    cssText: `${fontCss}${presetCss}\n${userSheet.cssText}`,
    classes,
  };
};
