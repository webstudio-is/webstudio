import { properties } from "@webstudio-is/css-data";
import { StyleValue } from "@webstudio-is/css-engine";
import type { Instance, StyleDecl, StyleSource } from "@webstudio-is/sdk";

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

/**
 * style selector is a full address in a tree
 * and style data to extract computed style
 */
export type StyleSelector = {
  instanceSelector: InstanceSelector;
};

type Style = Map<string, StyleDecl>;

/**
 * model contains all data and cache of computed styles
 * and manages reactive subscriptions
 */
export type StyleObjectModel = {
  styleSourcesByInstanceId: Map<Instance["id"], StyleSource["id"][]>;
  styleByStyleSourceId: Map<StyleSource["id"], Style>;
};

const getCascadedValue = ({
  model,
  instanceId,
  property,
}: {
  model: StyleObjectModel;
  instanceId: Instance["id"];
  property: string;
}) => {
  // https://drafts.csswg.org/css-cascade-5/#declared
  const declaredValues = [];
  const styleSourceIds = model.styleSourcesByInstanceId.get(instanceId);
  if (styleSourceIds) {
    for (const styleSourceId of styleSourceIds) {
      const style = model.styleByStyleSourceId.get(styleSourceId);
      const styleDecl = style?.get(property);
      if (styleDecl) {
        declaredValues.push(styleDecl.value);
      }
    }
  }

  // https://drafts.csswg.org/css-cascade-5/#cascaded
  const cascadedValue = declaredValues.at(-1);
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
 * - html
 * - preset
 * - cascaded
 * - selected style source
 * - selected state
 * - breakpoints
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
  property: string;
  /**
   * for internal use only
   */
  customPropertiesGraph?: Map<Instance["id"], Set<string>>;
}): {
  computedValue: StyleValue;
  usedValue: StyleValue;
} => {
  const { instanceSelector } = styleSelector;
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
    const { cascadedValue } = getCascadedValue({ model, instanceId, property });

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
