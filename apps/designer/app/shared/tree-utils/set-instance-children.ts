import { type ChildrenUpdates } from "@webstudio-is/react-sdk";
import { type Instance } from "@webstudio-is/react-sdk";
import { createInstance, createInstanceId } from "./create-instance";
import { findInstanceById } from "./find-instance";

type InstanceChild = Instance | string;

const hydrateTree = (parent: Instance, updates: ChildrenUpdates) => {
  const children: InstanceChild[] = [];
  for (const update of updates) {
    // Set a string as a child
    if (typeof update === "string") {
      children.push(update);
      continue;
    }
    // create new child or update existing
    const instanceId = update.id ?? createInstanceId();
    let child = findInstanceById(parent, instanceId);
    if (child == null) {
      child = createInstance({
        id: instanceId,
        component: update.component,
        children: [],
      });
    }
    children.push(child);
    hydrateTree(child, update.children);
  }
  parent.children = children;
};

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
  hydrateTree(instance, updates);
  return true;
};
