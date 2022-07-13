import { type Instance } from "@webstudio-is/sdk";
import { primitives } from "~/shared/canvas-components";

/**
 * Populate instance with:
 * - defaultStyle
 * - breakpoint
 */
export const populateInstanceMutable = (instance: Instance) => {
  const primitive = primitives[instance.component];
  if (primitive !== undefined && "defaultStyle" in primitive) {
    const cssRule = {
      breakpoint: "",
      style: primitive.defaultStyle,
    };
    instance.cssRules.push(cssRule);
  }
};
