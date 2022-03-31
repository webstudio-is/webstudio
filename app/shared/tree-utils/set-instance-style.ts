import { type Instance } from "@webstudio-is/sdk";
import { type StyleUpdates } from "~/shared/component";
import { findInstanceById } from "./find-instance";

export const setInstanceStyleMutable = (
  rootInstance: Instance,
  id: Instance["id"],
  updates: StyleUpdates["updates"]
) => {
  const instance = findInstanceById(rootInstance, id);
  if (instance === undefined) return false;

  for (const update of updates) {
    instance.style[update.property] = update.value;
  }
  return true;
};
