import {
  createRegularStyleSheet,
  generateAtomic,
  type NestingRule,
  type TransformValue,
} from "@webstudio-is/css-engine";
import {
  ROOT_INSTANCE_ID,
  createScope,
  parseComponentName,
  type Assets,
  type Breakpoints,
  type Instance,
  type Instances,
  type Props,
  type StyleSourceSelections,
  type Styles,
} from "@webstudio-is/sdk";
import type { WsComponentMeta } from "../components/component-meta";
import { descendantComponent, rootComponent } from "../core-components";
import { addGlobalRules } from "./global-rules";
import { kebabCase } from "change-case";

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
  const globalSheet = createRegularStyleSheet({ name: "ssr" });
  const sheet = createRegularStyleSheet({ name: "ssr" });

  addGlobalRules(globalSheet, { assets, assetBaseUrl });
  globalSheet.addMediaRule("presets");
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
    for (const [tag, styles] of presetStyle) {
      // use :where() to reset specificity of preset selector
      // and let user styles completely override it
      // ideally switch to @layer when better supported
      // render root preset styles without changes
      const selector =
        component === rootComponent ? ":root" : `:where(${tag}.${className})`;
      const rule = globalSheet.addNestingRule(selector);
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
    sheet.addMediaRule(breakpoint.id, breakpoint);
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
      const rule = sheet.addNestingRule(`:root`);
      rule.applyMixins(values);
      // avoid storing in instanceByRule to prevent conversion into atomic styles
      continue;
    }
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
    const meta = instance ? componentMetas.get(instance.component) : undefined;
    const baseName =
      instance?.label ?? meta?.label ?? instance?.component ?? instanceId;
    const className = `w-${scope.getName(instanceId, baseName)}`;
    if (atomic === false) {
      let classList = classes.get(instanceId);
      if (classList === undefined) {
        classList = [];
        classes.set(instanceId, classList);
      }
      classList.push(className);
    }
    const rule = sheet.addNestingRule(`.${className}`, descendantSuffix);
    rule.applyMixins(values);
    instanceByRule.set(rule, instanceId);
  }

  if (atomic) {
    const { cssText } = generateAtomic(sheet, {
      getKey: (rule) => instanceByRule.get(rule),
      transformValue: imageValueTransformer,
      classes,
    });
    return { cssText: `${globalSheet.cssText}\n${cssText}`, classes };
  }
  return {
    cssText: `${globalSheet.cssText}\n${sheet.cssText}`,
    classes,
  };
};
