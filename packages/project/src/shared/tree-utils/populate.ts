import { Breakpoint } from "@webstudio-is/css-data";
import { type Instance, getComponent } from "@webstudio-is/react-sdk";

/**
 * Populate instance with:
 * - defaultStyles
 * @todo rewrite using immer
 */
export const populateInstance = (
  instance: Instance,
  breakpoint: Breakpoint["id"] = ""
): Instance => {
  const populatedInstance = { ...instance };
  const componentMeta = getComponent(instance.component);
  if (componentMeta !== undefined && "defaultStyle" in componentMeta) {
    const cssRule = {
      breakpoint,
      style: componentMeta.defaultStyle ?? {},
    };
    populatedInstance.cssRules.push(cssRule);
  }
  return populatedInstance;
};
