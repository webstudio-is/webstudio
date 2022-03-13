import { type Style, type Instance } from "@webstudio-is/sdk";
import { type StyleUpdates } from "~/shared/component";

// @todo rewrite using immer
export const setInstanceStyle = (
  instance: Instance,
  id: Instance["id"],
  updates: StyleUpdates["updates"]
): Instance => {
  if (instance.id === id) {
    const style: Style = { ...instance.style };
    for (const update of updates) {
      style[update.property] = update.value;
    }
    return { ...instance, style };
  }

  for (const child of instance.children) {
    if (typeof child === "string") continue;
    const updatedChild = setInstanceStyle(child, id, updates);
    if (updatedChild !== child) {
      const children = [...instance.children];
      const index = children.indexOf(child);
      children[index] = updatedChild;
      return { ...instance, children };
    }
  }

  return instance;
};
