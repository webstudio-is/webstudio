import {
  createRegularStyleSheet,
  generateAtomic,
  type NestingRule,
  type TransformValue,
} from "@webstudio-is/css-engine";
import type {
  Assets,
  Breakpoints,
  Instance,
  Instances,
  Props,
  StyleSourceSelections,
  Styles,
} from "@webstudio-is/sdk";
import type { WsComponentMeta } from "../components/component-meta";
import { idAttribute } from "../props";
import { descendantComponent } from "../core-components";
import { addGlobalRules } from "./global-rules";
import { getPresetStyleRules } from "./style-rules";

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
  const sheet = createRegularStyleSheet({ name: "ssr" });
  const parentIdByInstanceId = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
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

  addGlobalRules(sheet, { assets, assetBaseUrl });

  for (const breakpoint of breakpoints.values()) {
    sheet.addMediaRule(breakpoint.id, breakpoint);
  }

  for (const [component, meta] of componentMetas) {
    const presetStyle = meta.presetStyle;
    if (presetStyle === undefined) {
      continue;
    }
    const rules = getPresetStyleRules(component, presetStyle);
    for (const [selector, style] of rules) {
      sheet.addStyleRule({ style }, selector);
    }
  }

  const imageValueTransformer = createImageValueTransformer(assets, {
    assetBaseUrl,
  });
  sheet.setTransformer(imageValueTransformer);

  for (const styleDecl of styles.values()) {
    const rule = sheet.addMixinRule(styleDecl.styleSourceId);
    rule.setDeclaration({
      breakpoint: styleDecl.breakpointId,
      selector: styleDecl.state ?? "",
      property: styleDecl.property,
      value: styleDecl.value,
    });
  }

  const instanceByRule = new Map<NestingRule, Instance["id"]>();
  for (const selection of styleSourceSelections.values()) {
    let { instanceId } = selection;
    const { values } = selection;
    let descendantSuffix = "";
    // render selector component as descendant selector
    const instance = instances.get(instanceId);
    if (instance?.component === descendantComponent) {
      const parentId = parentIdByInstanceId.get(instanceId);
      const descendantSelector = descendantSelectorByInstanceId.get(instanceId);
      if (parentId && descendantSelector) {
        descendantSuffix = descendantSelector;
        instanceId = parentId;
      }
    }
    const rule = sheet.addNestingRule(
      `[${idAttribute}="${instanceId}"]`,
      descendantSuffix
    );
    rule.applyMixins(values);
    instanceByRule.set(rule, instanceId);
  }

  if (atomic) {
    return generateAtomic(sheet, {
      getKey: (rule) => instanceByRule.get(rule) ?? "",
      transformValue: imageValueTransformer,
    });
  }
  return {
    cssText: sheet.cssText,
    classesMap: new Map<string, Array<string>>(),
  };
};
