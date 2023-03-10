import store from "immerhin";
import { findTreeInstanceIds, Instance } from "@webstudio-is/project-build";
import {
  rootInstanceContainer,
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  patchInstancesMutable,
  selectedPageStore,
} from "./nano-states";
import {
  createInstancesIndex,
  DroppableTarget,
  findParentInstance,
  findSubtreeLocalStyleSources,
  insertInstanceMutable,
  reparentInstanceMutable,
} from "./tree-utils";
import { removeByMutable } from "./array-utils";

export const insertInstance = (
  instance: Instance,
  dropTarget?: DroppableTarget
) => {
  const rootInstance = rootInstanceContainer.get();
  store.createTransaction([instancesStore], (instances) => {
    const instancesIndex = createInstancesIndex(rootInstance);
    insertInstanceMutable(instancesIndex, instance, dropTarget);
    patchInstancesMutable(rootInstance, instances);
  });
  selectedInstanceIdStore.set(instance.id);
};

export const reparentInstance = (
  targetInstanceId: Instance["id"],
  dropTarget: DroppableTarget
) => {
  const rootInstance = rootInstanceContainer.get();
  store.createTransaction([instancesStore], (instances) => {
    const instancesIndex = createInstancesIndex(rootInstance);
    reparentInstanceMutable(instancesIndex, targetInstanceId, dropTarget);
    patchInstancesMutable(rootInstance, instances);
  });
  selectedInstanceIdStore.set(targetInstanceId);
};

export const deleteInstance = (targetInstanceId: Instance["id"]) => {
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      const parentInstance = findParentInstance(instances, targetInstanceId);
      const subtreeIds = findTreeInstanceIds(instances, targetInstanceId);
      const subtreeLocalStyleSourceIds = findSubtreeLocalStyleSources(
        subtreeIds,
        styleSources,
        styleSourceSelections
      );

      // may not exist when delete root
      if (parentInstance) {
        removeByMutable(
          parentInstance.children,
          (child) => child.type === "id" && child.value === targetInstanceId
        );
      }

      for (const instanceId of subtreeIds) {
        instances.delete(instanceId);
      }
      // delete props and styles of deleted instance and its descendants
      for (const prop of props.values()) {
        if (subtreeIds.has(prop.instanceId)) {
          props.delete(prop.id);
        }
      }
      for (const instanceId of subtreeIds) {
        styleSourceSelections.delete(instanceId);
      }
      for (const styleSourceId of subtreeLocalStyleSourceIds) {
        styleSources.delete(styleSourceId);
      }
      for (const [styleDeclKey, styleDecl] of styles) {
        if (subtreeLocalStyleSourceIds.has(styleDecl.styleSourceId)) {
          styles.delete(styleDeclKey);
        }
      }

      if (parentInstance) {
        selectedInstanceIdStore.set(parentInstance.id);
      }
    }
  );
};

export const deleteSelectedInstance = () => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  const rootInstanceId = selectedPageStore.get()?.rootInstanceId;
  // @todo tell user they can't delete root
  if (
    selectedInstanceId === undefined ||
    selectedInstanceId === rootInstanceId
  ) {
    return;
  }
  deleteInstance(selectedInstanceId);
};
