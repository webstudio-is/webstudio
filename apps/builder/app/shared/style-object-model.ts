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

type Style = Map<StyleDecl["property"], StyleDecl>;

/**
 * model contains all data and cache of computed styles
 * and manages reactive subscriptions
 */
export type StyleObjectModel = {
  styleSourcesByInstanceId: Map<Instance["id"], StyleSource["id"][]>;
  styleByStyleSourceId: Map<StyleSource["id"], Style>;
};

type Property = keyof typeof properties;

const getCascadedValue = ({
  model,
  instanceId,
  property,
}: {
  model: StyleObjectModel;
  instanceId: Instance["id"];
  property: Property;
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
  styleValue?.type === "keyword" && styleValue.value === keyword;

/**
 * follow value processing specification
 * https://drafts.csswg.org/css-cascade-5/#value-stages
 *
 * @todo
 * - current color
 * - custom property
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
}: {
  model: StyleObjectModel;
  styleSelector: StyleSelector;
  property: Property;
}) => {
  const { instanceSelector } = styleSelector;
  const propertyData = properties[property];
  const inherited = propertyData.inherited;
  const initialValue = propertyData.initial;
  let computedValue: StyleValue = initialValue;

  // start computing from the root
  for (const instanceId of Array.from(instanceSelector).reverse()) {
    // https://drafts.csswg.org/css-cascade-5/#inheriting
    const inheritedValue: StyleValue = computedValue;

    // https://drafts.csswg.org/css-cascade-5/#cascaded
    const { cascadedValue } = getCascadedValue({ model, instanceId, property });

    // https://drafts.csswg.org/css-cascade-5/#specified
    let specifiedValue: StyleValue;
    // explicit defaulting
    // https://drafts.csswg.org/css-cascade-5/#defaulting-keywords
    if (matchKeyword(cascadedValue, "initial")) {
      specifiedValue = initialValue;
    } else if (matchKeyword(cascadedValue, "inherit")) {
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
  }

  return { computedValue };
};
