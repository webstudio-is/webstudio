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
    // create new child or update existing
    let childInstance = findInstanceById(instance, update.id);
    if (childInstance == null) {
      childInstance = createInstance({
        id: update.id,
        component: update.component,
        children: [update.text],
      });
      children.push(childInstance);
    } else {
      children.push({ ...childInstance, children: [update.text] });
    }
  }

  instance.children = children;
  return true;
};
