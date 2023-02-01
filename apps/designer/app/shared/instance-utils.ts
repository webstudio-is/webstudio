import store from "immerhin";
import { Instance } from "@webstudio-is/project-build";
import {
  rootInstanceContainer,
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
} from "./nano-states";
import { findSubtree } from "./tree-utils";
import { removeByMutable } from "./array-utils";

export const deleteInstance = (targetInstanceId: Instance["id"]) => {
  store.createTransaction(
    [rootInstanceContainer, propsStore, stylesStore],
    (rootInstance, props, styles) => {
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
      if (parentInstance === undefined) {
        return;
      }

      removeByMutable(
        parentInstance.children,
        (child) => child.type === "instance" && child.id === targetInstanceId
      );
      // delete props and styles of deleted instance and its descendants
      removeByMutable(props, (prop) => subtreeIds.has(prop.instanceId));
      removeByMutable(styles, (styleDecl) =>
        subtreeIds.has(styleDecl.instanceId)
      );

      selectedInstanceIdStore.set(parentInstance.id);
    }
  );
};
