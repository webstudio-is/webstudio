import { Breakpoint, type Instance } from "@webstudio-is/sdk";
import { type StyleUpdates } from "~/shared/component";
import { findInstanceById } from "./find-instance";

export const setInstanceStyleMutable = (
  rootInstance: Instance,
  id: Instance["id"],
  updates: StyleUpdates["updates"],
  breakpoint: Breakpoint
) => {
  const instance = findInstanceById(rootInstance, id);
  if (instance === undefined) return false;
  let cssRule = instance.cssRules.find(
    (cssRule) => cssRule.breakpoint === breakpoint.ref
  );
  if (cssRule === undefined) {
    cssRule = { style: {}, breakpoint: breakpoint.ref };
    instance.cssRules.push(cssRule);
  }

  for (const update of updates) {
    cssRule.style[update.property] = update.value;
  }
  return true;
};
