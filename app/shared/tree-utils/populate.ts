import { type Instance } from "@webstudio-is/sdk";
import { primitives } from "~/shared/component";

/**
 * Populate instance with:
 * - defaultStyles
 * @todo rewrite using immer
 */
export const populateInstance = (instance: Instance): Instance => {
  const populatedInstance = { ...instance };
  const primitive = primitives[instance.component];
  if (primitive !== undefined) {
    populatedInstance.style =
      "defaultStyle" in primitive
        ? { ...primitive.defaultStyle, ...instance.style }
        : instance.style;
  }
  return populatedInstance;
};

export const populateTree = (instance: Instance): Instance => {
  const populatedInstance = populateInstance(instance);
  populatedInstance.children = [];
  for (const child of instance.children) {
    const populatedChild =
      typeof child === "string" ? child : populateTree(child);
    populatedInstance.children.push(populatedChild);
  }
  return populatedInstance;
};
