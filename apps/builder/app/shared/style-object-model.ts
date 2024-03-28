import type { htmlTags as HtmlTags } from "html-tags";
import { html, properties } from "@webstudio-is/css-data";
import { StyleValue } from "@webstudio-is/css-engine";
import type {
  StyleDecl,
  Breakpoint,
  Instance,
  StyleSource,
} from "@webstudio-is/sdk";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";

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
type Property = string;

/**
 * style selector is a full address in a tree
 * and style data to extract computed style
 */
export type StyleSelector = {
  instanceSelector: InstanceSelector;
  /**
   * all currently matching and ordered breakpoints
   */
  matchingBreakpoints: Breakpoint["id"][];
  /**
   * all currently matching and ordered breakpointsgg
   */
  matchingStates: Set<string>;
};

/**
 * model contains all data and cache of computed styles
 * and manages reactive subscriptions
 */
export type StyleObjectModel = {
  styleSourcesByInstanceId: Map<Instance["id"], StyleSource["id"][]>;
  styleByStyleSourceId: Map<`${StyleSource["id"]}:${Property}`, StyleDecl[]>;
  metas: Map<Instance["component"], WsComponentMeta>;
  instanceTags: Map<Instance["id"], HtmlTags>;
  instanceComponents: Map<Instance["id"], Instance["component"]>;
};

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
type Specificity = [
  LAYER: number,
  STATE: number,
  BREAKPOINT: number,
  STYLESOURCE: number,
];

const compareSpecificity = (left: Specificity, right: Specificity) => {
  // LAYER-STATE-BREAKPOINT-STYLESOURCE
  const layerDiff = left[0] - right[0];
  if (layerDiff !== 0) {
    return layerDiff;
  }
  const stateDiff = left[1] - right[1];
  if (stateDiff !== 0) {
    return stateDiff;
  }
  const breakpointDiff = left[2] - right[2];
  if (breakpointDiff !== 0) {
    return breakpointDiff;
  }
  const styleSourceDiff = left[3] - right[3];
  if (styleSourceDiff !== 0) {
    return styleSourceDiff;
  }
  return 0;
};

const getSpecificity = ({
  layer,
  styleDecl,
  matchingBreakpoints,
  matchingStyleSources,
}: {
  layer: number;
  styleDecl: StyleDecl;
  matchingBreakpoints: Breakpoint["id"][];
  matchingStyleSources: StyleSource["id"][];
}): Specificity => {
  const state = styleDecl.state === undefined ? 0 : 1;
  const breakpoint = matchingBreakpoints.indexOf(styleDecl.breakpointId);
  const styleSource = matchingStyleSources.indexOf(styleDecl.styleSourceId);
  return [layer, state, breakpoint, styleSource];
};

const getCascadedValue = ({
  model,
  matchingBreakpoints,
  matchingStates,
  instanceId,
  property,
}: {
  model: StyleObjectModel;
  matchingBreakpoints: Breakpoint["id"][];
  matchingStates: Set<string>;
  instanceId: Instance["id"];
  property: Property;
}) => {
  const {
    styleSourcesByInstanceId,
    styleByStyleSourceId,
    instanceTags,
    instanceComponents,
    metas,
  } = model;
  const tag = instanceTags.get(instanceId);
  const component = instanceComponents.get(instanceId);
  const browserLayer = 0;
  const presetLayer = 1;
  const userLayer = 2;

  // https://drafts.csswg.org/css-cascade-5/#declared
  type DeclaredValue = { specificity: Specificity; value: StyleValue };
  const declaredValues: DeclaredValue[] = [];

  // browser styles
  const htmlStyles = tag ? html[tag] : undefined;
  if (htmlStyles) {
    for (const styleDecl of htmlStyles) {
      if (styleDecl.property !== property) {
        continue;
      }
      const specificity: Specificity = [browserLayer, 0, 0, 0];
      declaredValues.push({ specificity, value: styleDecl.value });
    }
  }

  // preset component styles
  const preset = component ? metas.get(component)?.presetStyle : undefined;
  const presetStyles = tag ? preset?.[tag] : undefined;
  if (presetStyles) {
    for (const styleDecl of presetStyles) {
      if (styleDecl.property !== property) {
        continue;
      }
      if (styleDecl.state && matchingStates.has(styleDecl.state) === false) {
        continue;
      }
      // states from preset styles are rendered with :where() to avoid increasing specificity
      const stateSpecificity = styleDecl.state === undefined ? 0 : 1;
      const specificity: Specificity = [presetLayer, stateSpecificity, 0, 0];
      declaredValues.push({ specificity, value: styleDecl.value });
    }
  }

  // user styles
  const styleSourceIds = styleSourcesByInstanceId.get(instanceId);
  if (styleSourceIds) {
    for (const styleSourceId of styleSourceIds) {
      const styles = styleByStyleSourceId.get(`${styleSourceId}:${property}`);
      if (styles === undefined) {
        continue;
      }
      for (const styleDecl of styles) {
        // exclude values from not matching breakpoints
        if (matchingBreakpoints.includes(styleDecl.breakpointId) === false) {
          continue;
        }
        if (styleDecl.state && matchingStates.has(styleDecl.state) === false) {
          continue;
        }
        // precompute specificity for all values before sorting
        const specificity = getSpecificity({
          layer: userLayer,
          styleDecl,
          matchingBreakpoints,
          matchingStyleSources: styleSourceIds,
        });
        declaredValues.push({ value: styleDecl.value, specificity });
      }
    }
  }

  declaredValues.sort((left, right) =>
    compareSpecificity(left.specificity, right.specificity)
  );

  // https://drafts.csswg.org/css-cascade-5/#cascaded
  const cascadedValue = declaredValues.at(-1)?.value;
  return { cascadedValue };
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

/**
 * follow value processing specification
 * https://drafts.csswg.org/css-cascade-5/#value-stages
 *
 * @todo
 * - selected style source
 * - selected state
 *
 */
export const getComputedStyleDecl = ({
  model,
  styleSelector,
  property,
  customPropertiesGraph = new Map(),
}: {
  model: StyleObjectModel;
  styleSelector: StyleSelector;
  property: Property;
  /**
   * for internal use only
   */
  customPropertiesGraph?: Map<Instance["id"], Set<Property>>;
}): {
  computedValue: StyleValue;
  usedValue: StyleValue;
} => {
  const { instanceSelector, matchingBreakpoints, matchingStates } =
    styleSelector;
  const isCustomProperty = property.startsWith("--");
  const propertyData = isCustomProperty
    ? customPropertyData
    : properties[property as keyof typeof properties];
  const inherited = propertyData.inherited;
  const initialValue: StyleValue = propertyData.initial;
  let computedValue: StyleValue = initialValue;

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

    // https://drafts.csswg.org/css-cascade-5/#cascaded
    const { cascadedValue } = getCascadedValue({
      model,
      matchingBreakpoints,
      matchingStates,
      instanceId,
      property,
    });

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
    } else {
      specifiedValue = initialValue;
    }

    // https://drafts.csswg.org/css-cascade-5/#computed
    computedValue = specifiedValue;

    if (computedValue.type === "var") {
      const customProperty = computedValue.value;
      // https://www.w3.org/TR/css-variables-1/#cycles
      if (usedCustomProperties.has(customProperty)) {
        computedValue = invalidValue;
        break;
      }
      usedCustomProperties.add(customProperty);

      const fallback = computedValue.fallbacks.at(0);
      const customPropertyValue = getComputedStyleDecl({
        model,
        styleSelector: {
          ...styleSelector,
          // resolve custom properties on instance they are defined
          // instead of where they are accessed
          instanceSelector: instanceSelector.slice(index),
        },
        property: customProperty,
        customPropertiesGraph,
      });
      computedValue = customPropertyValue.computedValue;
      // https://www.w3.org/TR/css-variables-1/#invalid-variables
      if (
        computedValue.type === "guaranteedInvalid" ||
        (isCustomProperty === false && computedValue.type === "invalid")
      ) {
        if (inherited) {
          computedValue = fallback ?? inheritedValue;
        } else {
          computedValue = fallback ?? initialValue;
        }
      }
    }
  }

  // https://drafts.csswg.org/css-cascade-5/#used
  let usedValue: StyleValue = computedValue;
  // https://drafts.csswg.org/css-color-4/#resolving-other-colors
  if (matchKeyword(computedValue, "currentcolor")) {
    const currentColor = getComputedStyleDecl({
      model,
      styleSelector,
      property: "color",
    });
    usedValue = currentColor.usedValue;
  }

  return { computedValue, usedValue };
};
