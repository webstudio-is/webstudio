import { type ChildrenUpdates } from "@webstudio-is/react-sdk";
import { type Instance } from "@webstudio-is/react-sdk";
import { createInstance } from "./create-instance";
import { findInstanceById } from "./find-instance";

/**
 * Update children of an instance with new text.
 * When child is an instance - we update it's children with a single text entry.
 */
export const setInstanceChildrenMutable = (
  id: Instance["id"],
  // Not a consistent format now, maybe better:
  // [{set: 'string'}, {set: instance}, {update: {id,text}}]
  updates: ChildrenUpdates,
  rootInstance: Instance
) => {
  const instance = findInstanceById(rootInstance, id);
  if (instance === undefined) return false;
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

  instance.children = children;
  return true;
};
