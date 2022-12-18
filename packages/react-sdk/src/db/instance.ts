import { CssRule } from "@webstudio-is/css-data";
import { z } from "zod";
import { ComponentName } from "../components";

// This should be used when passing a lot of data is potentially costly.
// For example, when passing data from an iframe.
export type BaseInstance = {
  id: string;
  component: ComponentName;
  cssRules: Array<CssRule>;
};

export type Instance = BaseInstance & {
  children: Array<Instance | string>;
};

export const toBaseInstance = (instance: Instance): BaseInstance => {
  return {
    id: instance.id,
    component: instance.component,
    cssRules: instance.cssRules,
  };
};

export const Instance = z.lazy(
  () =>
    z.object({
      id: z.string(),
      component: z.string(),
      children: z.array(z.union([Instance, z.string()])),
      cssRules: z.array(CssRule),
    })
  // @todo can't figure out how to make component to be z.enum(Object.keys(components))
) as z.ZodType<Instance>;

export type NormalizedInstance = {
  id: string;
  component: ComponentName;
  cssRules: Array<CssRule>;
  /**
   * number is an index in normalized tree
   * string is text content
   */
  children: (number | string)[];
};

export type NormalizedTree = (undefined | NormalizedInstance)[];

export const normalizeTree = (rootInstance: Instance) => {
  const normalizedTree: NormalizedTree = [];
  const traverse = (
    instance: Instance,
    normalizedInstance: NormalizedInstance
  ) => {
    for (const child of instance.children) {
      if (typeof child === "string") {
        normalizedInstance.children.push(child);
      } else {
        const normalizedChild = {
          id: child.id,
          component: child.component,
          cssRules: child.cssRules,
          children: [],
        };
        // push returns length
        const index = normalizedTree.push(normalizedChild) - 1;
        normalizedInstance.children.push(index);
        traverse(child, normalizedChild);
      }
    }
  };
  const normalizedRootInstance: NormalizedInstance = {
    id: rootInstance.id,
    component: rootInstance.component,
    cssRules: rootInstance.cssRules,
    children: [],
  };
  normalizedTree.push(normalizedRootInstance);
  traverse(rootInstance, normalizedRootInstance);
  return normalizedTree;
};

export const denormalizeTree = (normalizedTree: NormalizedTree) => {
  const [normalizedRoot] = normalizedTree;
  if (normalizedRoot === undefined) {
    throw Error("Root cannot be undefined");
  }
  const rootInstance: Instance = {
    id: normalizedRoot.id,
    component: normalizedRoot.component,
    cssRules: normalizedRoot.cssRules,
    children: [],
  };
  const traverse = (
    normalizedInstance: NormalizedInstance,
    instance: Instance
  ) => {
    for (const childValue of normalizedInstance.children) {
      if (typeof childValue === "string") {
        instance.children.push(childValue);
      } else {
        const normalizedChild = normalizedTree[childValue];
        if (normalizedChild === undefined) {
          throw Error(
            `Referenced by ${childValue} instance cannot be undefined`
          );
        }
        const child: Instance = {
          id: normalizedChild.id,
          component: normalizedChild.component,
          cssRules: normalizedChild.cssRules,
          children: [],
        };
        instance.children.push(child);
        traverse(normalizedChild, child);
      }
    }
  };
  traverse(normalizedRoot, rootInstance);
  return rootInstance;
};
