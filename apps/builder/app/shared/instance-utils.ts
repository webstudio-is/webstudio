import store from "immerhin";
import { findTreeInstanceIds } from "@webstudio-is/project-build";
import {
  propsStore,
  stylesStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
} from "./nano-states";
import {
  type DroppableTarget,
  type InstanceSelector,
  createComponentInstance,
  findSubtreeLocalStyleSources,
  insertInstancesMutable,
  reparentInstanceMutable,
  getAncestorInstanceSelector,
} from "./tree-utils";
import { removeByMutable } from "./array-utils";

export const insertNewComponentInstance = (
  component: string,
  dropTarget: DroppableTarget
) => {
  const instance = createComponentInstance(component);
  store.createTransaction([instancesStore], (instances) => {
    insertInstancesMutable(instances, [instance], [instance.id], dropTarget);
  });
  selectedInstanceSelectorStore.set([
    instance.id,
    ...dropTarget.parentSelector,
  ]);
};

export const reparentInstance = (
  targetInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  store.createTransaction([instancesStore], (instances) => {
    reparentInstanceMutable(instances, targetInstanceSelector, dropTarget);
  });
  selectedInstanceSelectorStore.set(targetInstanceSelector);
};

export const deleteInstance = (instanceSelector: InstanceSelector) => {
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      const [targetInstanceId, parentInstanceId] = instanceSelector;
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
        selectedInstanceSelectorStore.set(
          getAncestorInstanceSelector(instanceSelector, parentInstance.id)
        );
      }
    }
  );
};

export const deleteSelectedInstance = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  // @todo tell user they can't delete root
  if (
    selectedInstanceSelector === undefined ||
    selectedInstanceSelector.length === 1
  ) {
    return;
  }
  deleteInstance(selectedInstanceSelector);
};
