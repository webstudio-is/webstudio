import type { HtmlTags } from "html-tags";
import {
  camelCaseProperty,
  html,
  propertiesData,
} from "@webstudio-is/css-data";
import type {
  StyleValue,
  VarFallback,
  VarValue,
  UnparsedValue,
  CssProperty,
} from "@webstudio-is/css-engine";
import {
  type Instance,
  type StyleDecl,
  type StyleSourceSelections,
  type Styles,
  getStyleDeclKey,
} from "@webstudio-is/sdk";

/**
 *
 * use cases where computing is called
 *
 * 1. compiler
 *
 * put the whole tree into the model once
 * lazily compute each point in the tree reusing cached cascaded values
 *
 * 2. builder style panel
 *
 * property is updated within some point in the tree
 * invalidate only changed properties in model
 * lazily recompute changed properties
 *
 * custom property or color is updated within some point in the tree
 * invalidate dependent properties in model
 * lazily recompute changed and dependent properties
 *
 * any selection is changed
 * invalidate model
 * lazily recompute all properties
 *
 * 3. CSS Preview
 *
 * all properties are collected from instance selector
 * property are iterated with own model and computed
 *
 */

type InstanceSelector = string[];

export type StyleValueSourceColor =
  | "default"
  | "preset"
  | "remote"
  | "local"
  | "overwritten";

export type StyleValueSource = {
  name: StyleValueSourceColor;
  instanceId?: Instance["id"];
  styleSourceId?: StyleDecl["styleSourceId"];
  state?: StyleDecl["state"];
  breakpointId?: StyleDecl["breakpointId"];
};

/**
 * model contains all data and cache of computed styles
 * and manages reactive subscriptions
 */
export type StyleObjectModel = {
  styles: Styles;
  styleSourceSelections: StyleSourceSelections;
  // component:tag:state:property
  presetStyles: Map<string, StyleValue>;
  instanceTags: Map<Instance["id"], HtmlTags>;
  instanceComponents: Map<Instance["id"], Instance["component"]>;
  /**:
   * all currently matching and ordered breakpoints
   */
  matchingBreakpoints: StyleDecl["breakpointId"][];
  /**
   * all currently matching and ordered breakpointsgg
   */
  matchingStates: Set<string>;
};

export const getPresetStyleDeclKey = ({
  component,
  tag,
  state,
  property,
}: {
  component: string;
  tag: string;
  state?: string;
  property: CssProperty;
}) => `${component}:${tag}:${state ?? ""}:${property}`;

/**
 *
 * Standard specificity is defined as ID-CLASS-TYPE.
 * Though webstudio does not rely on these and also
 * cannot rely on order of declarations.
 *
 * Instead webstudio define own specificity format
 * LAYER-STATE-BREAKPOINT-STYLESOURCE
 *
 * LAYER is similar to @layer and allows to group parts of styles like browser, preset, user styles
 * and preset states are wrapped with :where to avoid specificity increasing
 * in the future can be replaced with actual cascade laters
 * Declaration with selected STATE gets 2, with any other STATE gets 1
 * Declaration BREAKPOINT is its position in ordered list
 * Declaration STYLESOURCE is its position in predefined list
 * excluding everything after selected STYLESOURCE
 *
 */
const getCascadedValue = ({
  model,
  instanceId,
  styleSourceId: selectedStyleSourceId,
  state: selectedState,
  property,
}: {
  model: StyleObjectModel;
  instanceId: Instance["id"];
  styleSourceId?: StyleDecl["styleSourceId"];
  state?: StyleDecl["state"];
  property: CssProperty;
}) => {
  const {
    styles,
    styleSourceSelections,
    presetStyles,
    instanceTags,
    instanceComponents,
    matchingBreakpoints,
    matchingStates,
  } = model;
  const tag = instanceTags.get(instanceId);
  const component = instanceComponents.get(instanceId);
  let selectedIndex = -1;
  // store the source of latest value
  let source: StyleValueSource = { name: "default" };

  // https://drafts.csswg.org/css-cascade-5/#declared
  const declaredValues: StyleValue[] = [];

  // browser styles
  if (tag) {
    const key = `${tag}:${property}`;
    const browserValue = html.get(key);
    if (browserValue) {
      declaredValues.push(browserValue);
    }
  }

  const states = new Set<undefined | string>();
  // allow stateless to be overwritten
  states.add(undefined);
  for (const state of matchingStates) {
    states.add(state);
  }
  // move selected state in the end if already present in matching states
  if (selectedState) {
    states.delete(selectedState);
    states.add(selectedState);
  }

  // preset component styles
  if (component && tag) {
    for (const state of states) {
      const key = getPresetStyleDeclKey({
        component,
        tag,
        state,
        property,
      });
      const styleValue = presetStyles.get(key);
      if (styleValue) {
        source = { name: "preset", state, instanceId };
        declaredValues.push(styleValue);
      }
    }
  }

  // user styles
  const styleSourceIds = styleSourceSelections.get(instanceId)?.values ?? [];
  selectedStyleSourceId ??= styleSourceIds.at(-1);
  for (const state of states) {
    for (const breakpointId of matchingBreakpoints) {
      for (const styleSourceId of styleSourceIds) {
        const key = getStyleDeclKey({
          styleSourceId,
          breakpointId,
          state,
          property: camelCaseProperty(property),
        });
        const styleDecl = styles.get(key);
        if (
          styleSourceId === selectedStyleSourceId &&
          state === selectedState
        ) {
          // reset selection from another state or breakpoint
          selectedIndex = styleDecl ? declaredValues.length : -1;
        }
        if (styleDecl) {
          source = {
            name: "remote",
            instanceId,
            styleSourceId,
            state,
            breakpointId,
          };
          declaredValues.push(styleDecl.value);
        }
      }
    }
  }

  // https://drafts.csswg.org/css-cascade-5/#cascaded
  // when reset or unselected (-1) take last declared value
  const cascadedValue = declaredValues.at(selectedIndex);
  if (cascadedValue) {
    if (selectedIndex > -1) {
      // local when selected value is latest declared
      if (selectedIndex === declaredValues.length - 1) {
        source.name = "local";
      } else {
        source.name = "overwritten";
      }
    }
    return { value: cascadedValue, source };
  }
};

const matchKeyword = (styleValue: undefined | StyleValue, keyword: string) =>
  styleValue?.type === "keyword" && styleValue.value.toLowerCase() === keyword;

/**
 * stable invalid values to support caching
 */
const guaranteedInvalidValue: StyleValue = { type: "guaranteedInvalid" };
const invalidValue: StyleValue = { type: "invalid", value: "" };

const customPropertyData = {
  inherited: true,
  initial: guaranteedInvalidValue,
};

const invalidPropertyData = {
  inherited: false,
  initial: invalidValue,
};

const substituteVars = (
  styleValue: StyleValue,
  mapper: (value: VarValue) => StyleValue
): StyleValue => {
  if (styleValue.type === "var") {
    return mapper(styleValue);
  }
  if (styleValue.type === "layers" || styleValue.type === "tuple") {
    const newItems: UnparsedValue[] = [];
    let hasVars = false;
    for (const item of styleValue.value) {
      if (item.type === "var") {
        hasVars = true;
        newItems.push(mapper(item) as UnparsedValue);
      } else {
        newItems.push(item as UnparsedValue);
      }
    }
    if (hasVars) {
      return { ...styleValue, value: newItems };
    }
  }
  return styleValue;
};

export type ComputedStyleDecl = {
  property: CssProperty;
  source: StyleValueSource;
  cascadedValue: StyleValue;
  computedValue: StyleValue;
  usedValue: StyleValue;
};

/**
 * follow value processing specification
 * https://drafts.csswg.org/css-cascade-5/#value-stages
 */
export const getComputedStyleDecl = ({
  model,
  instanceSelector = [],
  styleSourceId,
  state,
  property,
  customPropertiesGraph = new Map(),
}: {
  model: StyleObjectModel;
  instanceSelector?: InstanceSelector;
  styleSourceId?: StyleDecl["styleSourceId"];
  state?: StyleDecl["state"];
  property: CssProperty;
  /**
   * for internal use only
   */
  customPropertiesGraph?: Map<Instance["id"], Set<CssProperty>>;
}): ComputedStyleDecl => {
  const isCustomProperty = property.startsWith("--");
  const propertyData = isCustomProperty
    ? customPropertyData
    : (propertiesData[property] ?? invalidPropertyData);
  const inherited = propertyData.inherited;
  const initialValue: StyleValue = propertyData.initial;
  let computedValue: StyleValue = initialValue;
  let cascadedValue: undefined | StyleValue;
  let source: StyleValueSource = { name: "default" };

  // start computing from the root
  for (let index = instanceSelector.length - 1; index >= 0; index -= 1) {
    const instanceId = instanceSelector[index];
    let usedCustomProperties = customPropertiesGraph.get(instanceId);
    if (usedCustomProperties === undefined) {
      usedCustomProperties = new Set();
      customPropertiesGraph.set(instanceId, usedCustomProperties);
    }

    // https://drafts.csswg.org/css-cascade-5/#inheriting
    const inheritedValue: StyleValue = computedValue;
    const inheritedSource: StyleValueSource =
      source.name === "local" ? { ...source, name: "remote" } : source;

    // https://drafts.csswg.org/css-cascade-5/#cascaded
    const cascaded = getCascadedValue({
      model,
      instanceId,
      styleSourceId,
      state,
      property,
    });
    cascadedValue = cascaded?.value;
    source = cascaded?.source ?? { name: "default" };

    // resolve specified value
    // https://drafts.csswg.org/css-cascade-5/#specified
    let specifiedValue: StyleValue = initialValue;

    // explicit defaulting
    // https://drafts.csswg.org/css-cascade-5/#defaulting-keywords
    if (matchKeyword(cascadedValue, "initial")) {
      specifiedValue = initialValue;
    } else if (
      matchKeyword(cascadedValue, "inherit") ||
      // treat currentcolor as inherit when used on color property
      // https://www.w3.org/TR/css-color-3/#currentColor-def
      (property === "color" && matchKeyword(cascadedValue, "currentcolor"))
    ) {
      specifiedValue = inheritedValue;
    } else if (matchKeyword(cascadedValue, "unset")) {
      if (inherited) {
        specifiedValue = inheritedValue;
      } else {
        specifiedValue = initialValue;
      }
    } else if (cascadedValue) {
      specifiedValue = cascadedValue;
    }
    // defaulting https://drafts.csswg.org/css-cascade-5/#defaulting
    else if (inherited) {
      specifiedValue = inheritedValue;
      source = inheritedSource;
    } else {
      specifiedValue = initialValue;
    }

    // https://drafts.csswg.org/css-cascade-5/#computed
    computedValue = specifiedValue;

    let invalid = false;
    // check whether the property was used with parent node
    // to support var(--var1), var(--var1) layers
    const parentUsedCustomProperties = usedCustomProperties;
    usedCustomProperties = new Set<CssProperty>(usedCustomProperties);
    customPropertiesGraph.set(instanceId, usedCustomProperties);
    computedValue = substituteVars(computedValue, (varValue) => {
      const customProperty = `--${varValue.value}` as const;
      // https://www.w3.org/TR/css-variables-1/#cycles
      if (parentUsedCustomProperties.has(customProperty)) {
        invalid = true;
        return varValue;
      }
      usedCustomProperties.add(customProperty);

      const fallback: undefined | VarFallback = varValue.fallback;
      const customPropertyValue = getComputedStyleDecl({
        model,
        // resolve custom properties on instance they are defined
        // instead of where they are accessed
        instanceSelector: instanceSelector.slice(index),
        property: customProperty,
        customPropertiesGraph,
      });
      let replacement = customPropertyValue.computedValue;
      // https://www.w3.org/TR/css-variables-1/#invalid-variables
      if (
        replacement.type === "guaranteedInvalid" ||
        (isCustomProperty === false && replacement.type === "invalid")
      ) {
        if (inherited) {
          replacement = fallback ?? inheritedValue;
        } else {
          replacement = fallback ?? initialValue;
        }
      }
      return replacement;
    });
    if (invalid) {
      computedValue = invalidValue;
      break;
    }
  }

  // https://drafts.csswg.org/css-cascade-5/#used
  let usedValue: StyleValue = computedValue;
  // https://drafts.csswg.org/css-color-4/#resolving-other-colors
  if (matchKeyword(computedValue, "currentcolor")) {
    const currentColor = getComputedStyleDecl({
      model,
      instanceSelector,
      property: "color",
    });
    usedValue = currentColor.usedValue;
  }

  // fallback to inherited value
  cascadedValue ??= computedValue;

  return { property, source, cascadedValue, computedValue, usedValue };
};
