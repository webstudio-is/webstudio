import ObjectId from "bson-objectid";
import produce from "immer";
import type { Instance, Props, Styles } from "@webstudio-is/project-build";
import { removeByMutable } from "./array-utils";

const traverseInstances = (
  instance: Instance,
  cb: (child: Instance, parent: Instance) => void
) => {
  for (const child of instance.children) {
    if (child.type === "text") {
      continue;
    }
    if (child.type === "instance") {
      cb(child, instance);
      traverseInstances(child, cb);
    }
  }
};

export const findSubtree = (
  rootInstance: Instance,
  targetInstanceId: Instance["id"]
) => {
  const instancesById = new Map<Instance["id"], Instance>();
  const parentInstancesById = new Map<Instance["id"], Instance>();
  const subtreeIds = new Set<Instance["id"]>();

  traverseInstances(rootInstance, (child, instance) => {
    // add target instance
    if (child.id === targetInstanceId) {
      subtreeIds.add(child.id);
      parentInstancesById.set(child.id, instance);
      instancesById.set(child.id, child);
    }
    // add all descendants of target instance
    if (subtreeIds.has(instance.id)) {
      subtreeIds.add(child.id);
    }
  });

  return {
    parentInstance: parentInstancesById.get(targetInstanceId),
    targetInstance: instancesById.get(targetInstanceId),
    subtreeIds,
  };
};

export const cloneInstance = (targetInstance: Instance) => {
  const clonedIds = new Map<Instance["id"], Instance["id"]>();
  const clonedInstance = produce((targetInstance) => {
    const newId = ObjectId().toString();
    clonedIds.set(targetInstance.id, newId);
    targetInstance.id = newId;
    traverseInstances(targetInstance, (instance) => {
      const newId = ObjectId().toString();
      clonedIds.set(instance.id, newId);
      instance.id = newId;
    });
  })(targetInstance);
  return {
    clonedIds,
    clonedInstance,
  };
};

export const deleteInstanceMutable = ({
  rootInstance,
  props,
  styles,
  deletedInstanceId,
}: {
  rootInstance: Instance;
  props: Props;
  styles: Styles;
  deletedInstanceId: string;
}) => {
  const { parentInstance, subtreeIds: deletedInstances } = findSubtree(
    rootInstance,
    deletedInstanceId
  );
  if (parentInstance === undefined) {
    return;
  }

  removeByMutable(
    parentInstance.children,
    (child) => child.type === "instance" && child.id === deletedInstanceId
  );
  // delete props and styles of deleted instance and its descendants
  removeByMutable(props, (prop) => deletedInstances.has(prop.instanceId));
  removeByMutable(styles, (styleDecl) =>
    deletedInstances.has(styleDecl.instanceId)
  );

  return parentInstance;
};
