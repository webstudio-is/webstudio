import { useEffect } from "react";
import store from "immerhin";
import type { Instance, Props, Styles } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { utils, type InstanceInsertionSpec } from "@webstudio-is/project";
import { useSubscribe } from "~/shared/pubsub";
import {
  propsStore,
  rootInstanceContainer,
  stylesStore,
  selectedInstanceIdStore,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";
import { deleteInstanceMutable } from "~/shared/tree-utils";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    textEditingInstanceId?: Instance["id"];
    insertInstance: {
      instance: Instance;
      dropTarget?: { parentId: Instance["id"]; position: number };
      props?: Props;
      styles?: Styles;
    };
  }
}

export const findInsertLocation = (
  rootInstance: Instance,
  selectedInstanceId: Instance["id"] | undefined
): InstanceInsertionSpec => {
  if (selectedInstanceId === undefined) {
    return { parentId: rootInstance.id, position: "end" };
  }

  const path = utils.tree.getInstancePathWithPositions(
    rootInstance,
    selectedInstanceId
  );
  path.reverse();

  const parentIndex = path.findIndex(({ item }) => {
    const meta = getComponentMeta(item.component);
    return meta?.type === "body" || meta?.type === "container";
  });

  // Just in case selected Instance is not in the tree for some reason.
  if (parentIndex === -1) {
    return { parentId: rootInstance.id, position: "end" };
  }

  return {
    parentId: path[parentIndex].item.id,
    position: parentIndex === 0 ? "end" : path[parentIndex - 1].position + 1,
  };
};

export const useInsertInstance = () => {
  useSubscribe(
    "insertInstance",
    ({
      instance,
      dropTarget,
      props: insertedProps,
      styles: insertedStyles,
    }) => {
      const selectedInstanceId = selectedInstanceIdStore.get();
      store.createTransaction(
        [rootInstanceContainer, propsStore, stylesStore],
        (rootInstance, props, styles) => {
          if (rootInstance === undefined) {
            return;
          }
          const hasInserted = utils.tree.insertInstanceMutable(
            rootInstance,
            instance,
            dropTarget ?? findInsertLocation(rootInstance, selectedInstanceId)
          );
          if (hasInserted) {
            selectedInstanceIdStore.set(instance.id);
          }
          if (insertedProps !== undefined) {
            props.push(...insertedProps);
          }
          if (insertedStyles !== undefined) {
            styles.push(...insertedStyles);
          }
        }
      );
    }
  );
};

export const useReparentInstance = () => {
  useSubscribe("reparentInstance", ({ instanceId, dropTarget }) => {
    const selectedInstanceId = selectedInstanceIdStore.get();
    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) {
        return;
      }
      utils.tree.reparentInstanceMutable(
        rootInstance,
        instanceId,
        dropTarget.instanceId,
        dropTarget.position
      );
    });

    const rootInstance = rootInstanceContainer.get();
    // Make the drag item the selected instance
    if (selectedInstanceId !== instanceId && rootInstance !== undefined) {
      selectedInstanceIdStore.set(instanceId);
    }
  });
};

export const useDeleteInstance = () => {
  useSubscribe("deleteInstance", ({ id: deletedInstanceId }) => {
    const rootInstance = rootInstanceContainer.get();
    // @todo tell user they can't delete root
    if (deletedInstanceId === rootInstance?.id) {
      return;
    }
    store.createTransaction(
      [rootInstanceContainer, propsStore, stylesStore],
      (rootInstance, props, styles) => {
        if (rootInstance === undefined) {
          return;
        }
        const parentInstance = deleteInstanceMutable({
          rootInstance,
          props,
          styles,
          deletedInstanceId,
        });
        if (parentInstance) {
          selectedInstanceIdStore.set(parentInstance.id);
        }
      }
    );
  });
};

export const usePublishTextEditingInstanceId = () => {
  const [editingInstanceId] = useTextEditingInstanceId();
  useEffect(() => {
    publish({
      type: "textEditingInstanceId",
      payload: editingInstanceId,
    });
  }, [editingInstanceId]);
};
