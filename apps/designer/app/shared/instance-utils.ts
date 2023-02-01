import store from "immerhin";
import { Instance } from "@webstudio-is/project-build";
import {
  rootInstanceContainer,
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
} from "./nano-states";
import { findSubtree, findSubtreeLocalStyleSources } from "./tree-utils";
import { removeByMutable } from "./array-utils";

export const deleteInstance = (targetInstanceId: Instance["id"]) => {
  store.createTransaction(
    [
      rootInstanceContainer,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (rootInstance, props, styleSourceSelections, styleSources, styles) => {
      if (rootInstance === undefined) {
        return;
      }
      // @todo tell user they can't delete root
      if (targetInstanceId === rootInstance?.id) {
        return;
      }
      const { parentInstance, subtreeIds } = findSubtree(
        rootInstance,
        targetInstanceId
      );
      const subtreeLocalStyleSourceIds = findSubtreeLocalStyleSources(
        subtreeIds,
        styleSources,
        styleSourceSelections
      );
      if (parentInstance === undefined) {
        return;
      }

      removeByMutable(
        parentInstance.children,
        (child) => child.type === "instance" && child.id === targetInstanceId
      );
      // delete props and styles of deleted instance and its descendants
      removeByMutable(props, (prop) => subtreeIds.has(prop.instanceId));
      removeByMutable(styleSourceSelections, (styleSourceSelection) =>
        subtreeIds.has(styleSourceSelection.instanceId)
      );
      removeByMutable(styleSources, (styleSource) =>
        subtreeLocalStyleSourceIds.has(styleSource.id)
      );
      // @todo migrate to style source variant
      removeByMutable(styles, (styleDecl) =>
        subtreeIds.has(styleDecl.instanceId)
      );

      selectedInstanceIdStore.set(parentInstance.id);
    }
  );
};
