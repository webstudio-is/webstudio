import { type Instance } from "@webstudio-is/sdk";
import { primitives } from "~/shared/canvas-components";

/**
 * Populate instance with:
 * - defaultStyles
 * @todo rewrite using immer
 */
export const populateInstance = (instance: Instance): Instance => {
  const populatedInstance = { ...instance };
  const primitive = primitives[instance.component];
  if (primitive !== undefined && "defaultStyle" in primitive) {
    const cssRule = {
      breakpoint: "",
      style: primitive.defaultStyle,
    };
    populatedInstance.cssRules.push(cssRule);
  }
  return populatedInstance;
};
