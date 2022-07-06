import { type Instance } from "@webstudio-is/sdk";

export type InstanceInsertionSpec = {
  parentId: Instance["id"];
  position: number | "end";
};

export const insertInstanceMutable = (
  rootInstance: Instance,
  instance: Instance,
  spec: InstanceInsertionSpec
): boolean => {
  if (spec.parentId !== rootInstance.id) {
    for (const child of rootInstance.children) {
      if (typeof child === "string") continue;
      const hasInserted = insertInstanceMutable(child, instance, spec);
      if (hasInserted === true) return true;
    }
    return false;
  }

  // Inserting inside the selected/hovered instance.
  if (typeof spec.position === "number") {
    rootInstance.children.splice(spec.position, 0, instance);
    return true;
  }

  // Inserting after all children
  if (spec.position === "end") {
    rootInstance.children.push(instance);
    return true;
  }

  return true;
};
