import {
  type Instance,
  type Breakpoint,
  components,
} from "@webstudio-is/react-sdk";

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
  const componentMeta = components[instance.component];
  if (componentMeta !== undefined && "defaultStyle" in componentMeta) {
    const cssRule = {
      breakpoint,
      style: componentMeta.defaultStyle ?? {},
    };
    populatedInstance.cssRules.push(cssRule);
  }
  return populatedInstance;
};
