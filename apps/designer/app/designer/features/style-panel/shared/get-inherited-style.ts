import { properties } from "@webstudio-is/css-data";
import type { StyleValue, StyleProperty } from "@webstudio-is/css-data";
import type { Instance } from "@webstudio-is/react-sdk";

export type InheritedStyle = {
  [property in StyleProperty]: {
    instance: Instance;
    value: StyleValue;
  };
};

type InheritableProperties = { [property in StyleProperty]: true };
// Object keys should give `keyof typeof ...` but now it gives string[]
const propertyNames = Object.keys(properties) as (keyof typeof properties)[];
// All inheritable properties we support
const inheritableProperties: InheritableProperties = propertyNames.reduce(
  (acc: InheritableProperties, property) => {
    // @todo
    const config = properties[property];
    if (config.inherited) {
      acc[property as StyleProperty] = true;
    }
    return acc;
  },
  {} as InheritableProperties
);

const findParents = (
  instance: Instance,
  instanceId: Instance["id"]
): Array<Instance> => {
  const parents: Array<Instance> = [];

  for (const child of instance.children) {
    if (typeof child === "string") {
      continue;
    }
    // I am your father
    if (child.id === instanceId) {
      parents.push(instance);
      break;
    }
    const foundParents = findParents(child, instanceId);
    // eslint-disable-next-line prefer-spread
    parents.push.apply(parents, foundParents);
  }
  return parents;
};

// - Walk down the tree and remember all parent instances until the found instance
// - Walk back up and find a value for each inheritable property and where value is not "inherit"
// @todo this also has to match the media query, otheriwse its wrong
export const getInheritedStyle = (
  rootInstance: Instance,
  instanceId: Instance["id"]
): InheritedStyle => {
  const parents = findParents(rootInstance, instanceId).reverse();
  const inheritedStyle = {} as InheritedStyle;
  for (const parent of parents) {
    for (const cssRule of parent.cssRules) {
      for (const property in cssRule.style) {
        const isInheritable = property in inheritableProperties;
        const value = cssRule.style[property as StyleProperty];
        const hasValue = value !== undefined && value.value !== "inherit";
        const isFirst = property in inheritedStyle === false;
        if (isInheritable && hasValue && isFirst) {
          inheritedStyle[property as StyleProperty] = {
            instance: parent,
            value,
          };
        }
      }
    }
  }
  return inheritedStyle;
};
