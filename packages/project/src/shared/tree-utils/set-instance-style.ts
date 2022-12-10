import type { Breakpoint } from "@webstudio-is/css-data";
import type { Instance } from "@webstudio-is/react-sdk";
import type { StyleUpdates } from "../canvas-components";
import { findInstanceById } from "./find-instance";

export const setInstanceStyleMutable = (
  rootInstance: Instance,
  id: Instance["id"],
  updates: StyleUpdates["updates"],
  breakpoint: Breakpoint
) => {
  const instance = findInstanceById(rootInstance, id);
  if (instance === undefined) {
    return false;
  }
  let cssRule = instance.cssRules.find(
    (cssRule) => cssRule.breakpoint === breakpoint.id
  );
  if (cssRule === undefined) {
    cssRule = { style: {}, breakpoint: breakpoint.id };
    instance.cssRules.push(cssRule);
  }

  for (const update of updates) {
    if (update.operation === "delete") {
      delete cssRule.style[update.property];
    }
    if (update.operation === "set") {
      cssRule.style[update.property] = update.value;
    }
  }
  return true;
};
