import { useEffect } from "react";
import {
  type Instance,
  type PropsItem,
  getComponentMeta,
  allUserPropsContainer,
} from "@webstudio-is/react-sdk";

import { useSubscribe } from "~/shared/pubsub";
import { utils, type InstanceInsertionSpec } from "@webstudio-is/project";
import store from "immerhin";
import {
  rootInstanceContainer,
  selectedInstanceIdStore,
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    textEditingInstanceId?: Instance["id"];
    insertInstance: {
      instance: Instance;
      dropTarget?: { parentId: Instance["id"]; position: number };
      props?: Array<PropsItem>;
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
    const { type } = getComponentMeta(item.component);
    return type === "body" || type === "container";
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
  useSubscribe("insertInstance", ({ instance, dropTarget, props }) => {
    const selectedInstanceId = selectedInstanceIdStore.get();
    store.createTransaction(
      [rootInstanceContainer, allUserPropsContainer],
      (rootInstance, allUserProps) => {
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
        if (props !== undefined) {
          allUserProps[instance.id] = props;
        }
      }
    );
  });
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
  const [rootInstance] = useRootInstance();
  useSubscribe("deleteInstance", ({ id }) => {
    const selectedInstanceId = selectedInstanceIdStore.get();
    if (rootInstance !== undefined && selectedInstanceId !== undefined) {
      // @todo tell user they can't delete root
      if (id === rootInstance.id) {
        return;
      }

      const parentInstance = utils.tree.findParentInstance(rootInstance, id);
      if (parentInstance !== undefined) {
        const siblingInstance = utils.tree.findParentInstance(
          parentInstance,
          id
        );
        selectedInstanceIdStore.set(siblingInstance?.id ?? parentInstance.id);
      }
    }
    // @todo deleting instance should involve also deleting it's props
    // If we don't delete them - they just live both on client and db
    // Pros:
    //   - if we undo the deletion we don't need to undo the props deletion
    //   - in a multiplayer environment, some other user could have changed a prop while we have deleted the instance
    // and then if we restore the instance, we would be restoring it with our props, potentially overwriting other users changes
    // The way it is now it will actually still enable parallel deletion props editing and restoration.
    // Contra: we are piling them up.
    // Potentially we could also solve this by periodically removing unused props after while when instance was deleted
    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance !== undefined) {
        utils.tree.deleteInstanceMutable(rootInstance, id);
      }
    });
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
