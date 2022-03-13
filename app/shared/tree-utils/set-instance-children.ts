import { type ChildrenUpdates } from "@webstudio-is/sdk";
import { type Instance } from "@webstudio-is/sdk";
import { createInstance } from "./create-instance";
import { findInstanceById } from "./find-instance";

/**
 * Update children of an instance with new text.
 * When child is an instance - we update it's children with a single text entry.
 * Upd
 * @todo rewrite with immer
 */
export const setInstanceChildren = (
  id: Instance["id"],
  // Not a consistent format now, maybe better:
  // [{set: 'string'}, {set: instance}, {update: {id,text}}]
  updates: ChildrenUpdates,
  instance: Instance
): Instance => {
  if (instance.id === id) {
    const children = [];
    for (const update of updates) {
      // Set a string as a child
      if (typeof update === "string") {
        children.push(update);
        continue;
      }
      // We need to create an instance
      if ("createInstance" in update) {
        const childInstance = createInstance({
          id: update.id,
          component: update.component,
          children: [update.text],
        });
        children.push(childInstance);
        continue;
      }

      // Set text as a single child of a child instance
      if ("text" in update) {
        const childInstance = findInstanceById(instance, update.id);
        // It should be impossible to have not found that instance
        if (childInstance === undefined) continue;
        children.push({ ...childInstance, children: [update.text] });
        continue;
      }

      // It's a new instance.
      children.push(update);
    }
    return { ...instance, children };
  }

  for (const child of instance.children) {
    if (typeof child === "string") continue;
    const updatedChild = setInstanceChildren(id, updates, child);
    if (updatedChild !== child) {
      const children = [...instance.children];
      const index = children.indexOf(child);
      children[index] = updatedChild;
      return { ...instance, children };
    }
  }

  return instance;
};
