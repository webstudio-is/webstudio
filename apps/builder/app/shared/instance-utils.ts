import store from "immerhin";
import { findTreeInstanceIds, Instance } from "@webstudio-is/project-build";
import {
  propsStore,
  stylesStore,
  selectedInstanceAddressStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  selectedPageStore,
} from "./nano-states";
import {
  type DroppableTarget,
  type InstanceAddress,
  createComponentInstance,
  findSubtreeLocalStyleSources,
  getInstanceAddress,
  insertInstancesMutable,
  reparentInstanceMutable,
  getAncestorInstanceAddress,
} from "./tree-utils";
import { removeByMutable } from "./array-utils";

export const insertNewComponentInstance = (
  component: string,
  dropTarget?: DroppableTarget
) => {
  const instance = createComponentInstance(component);
  store.createTransaction([instancesStore], (instances) => {
    insertInstancesMutable(instances, [instance], [instance.id], dropTarget);
  });
  selectedInstanceAddressStore.set(
    getInstanceAddress(instancesStore.get(), instance.id)
  );
};

export const reparentInstance = (
  targetInstanceId: Instance["id"],
  dropTarget: DroppableTarget
) => {
  store.createTransaction([instancesStore], (instances) => {
    reparentInstanceMutable(
      instances,
      getInstanceAddress(instances, targetInstanceId),
      dropTarget
    );
  });
  selectedInstanceAddressStore.set(
    getInstanceAddress(instancesStore.get(), targetInstanceId)
  );
};

export const deleteInstance = (instanceAddress: InstanceAddress) => {
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      const [targetInstanceId, parentInstanceId] = instanceAddress;
      const parentInstance =
        parentInstanceId === undefined
          ? undefined
          : instances.get(parentInstanceId);
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
        selectedInstanceAddressStore.set(
          getAncestorInstanceAddress(instanceAddress, parentInstance.id)
        );
      }
    }
  );
};

export const deleteSelectedInstance = () => {
  const selectedInstanceAddress = selectedInstanceAddressStore.get();
  const rootInstanceId = selectedPageStore.get()?.rootInstanceId;
  // @todo tell user they can't delete root
  if (
    selectedInstanceAddress === undefined ||
    selectedInstanceAddress[0] === rootInstanceId
  ) {
    return;
  }
  deleteInstance(selectedInstanceAddress);
};
