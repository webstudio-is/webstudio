import { useEffect, useState } from "react";
import {
  type Instance,
  type UserProp,
  type Tree,
  getComponentMeta,
  allUserPropsContainer,
} from "@webstudio-is/react-sdk";

import { useSubscribe } from "~/shared/pubsub";
import {
  utils,
  type HoveredInstanceData,
  type InstanceInsertionSpec,
  type SelectedInstanceData,
} from "@webstudio-is/project";
import store from "immerhin";
import { useSelectedInstance } from "./nano-states";
import {
  rootInstanceContainer,
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    hoveredInstanceRect: DOMRect;
    hoverInstance?: HoveredInstanceData;
    selectInstance?: SelectedInstanceData;
    textEditingInstanceId?: Instance["id"];
    insertInstance: {
      instance: Instance;
      dropTarget?: { parentId: Instance["id"]; position: number };
      props?: Array<UserProp>;
    };
    unselectInstance: undefined;
  }
}

export const usePopulateRootInstance = (tree: Tree) => {
  useState(() => {
    rootInstanceContainer.value = tree.root;
  });
};

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

export const useInsertInstance = ({ treeId }: { treeId: string }) => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  useSubscribe("insertInstance", ({ instance, dropTarget, props }) => {
    store.createTransaction(
      [rootInstanceContainer, allUserPropsContainer],
      (rootInstance, allUserProps) => {
        if (rootInstance === undefined) {
          return;
        }
        const hasInserted = utils.tree.insertInstanceMutable(
          rootInstance,
          instance,
          dropTarget ?? findInsertLocation(rootInstance, selectedInstance?.id)
        );
        if (hasInserted) {
          setSelectedInstance(instance);
        }
        if (props !== undefined) {
          allUserProps[instance.id] = utils.props.createInstanceProps({
            instanceId: instance.id,
            treeId,
            props,
          });
        }
      }
    );
  });
};

export const useReparentInstance = () => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  useSubscribe("reparentInstance", ({ instanceId, dropTarget }) => {
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

    // Make the drag item the selected instance
    if (
      selectedInstance?.id !== instanceId &&
      rootInstanceContainer.value !== undefined
    ) {
      setSelectedInstance(
        utils.tree.findInstanceById(rootInstanceContainer.value, instanceId)
      );
    }
  });
};

export const useDeleteInstance = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  useSubscribe("deleteInstance", ({ id }) => {
    if (rootInstance !== undefined && selectedInstance !== undefined) {
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
        setSelectedInstance(siblingInstance || parentInstance);
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

export const usePublishSelectedInstanceData = () => {
  const [instance] = useSelectedInstance();

  useEffect(() => {
    // Unselects the instance by `undefined`
    if (instance === undefined) {
      publish({
        type: "selectInstance",
        payload: undefined,
      });
    }
  }, [instance]);
};

/**
 *  We need to set the selected instance after a any root instance update,
 *  because anything that we change on the selected instance is actually done on the root, so
 *  when we run "undo", root is going to be undone but not the selected instance, unless we update it here.
 */
export const useUpdateSelectedInstance = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  // When selected instance or root instance changes - we want to make sure the instance with that id still exists in the root.
  useEffect(() => {
    let instance;
    if (rootInstance !== undefined && selectedInstance?.id) {
      instance = utils.tree.findInstanceById(rootInstance, selectedInstance.id);
    }
    // When it's a new inserted instance, it will be undefined, so we can't set it to undefined and remove it.
    if (instance !== undefined) {
      setSelectedInstance(instance);
    }
  }, [rootInstance, selectedInstance, setSelectedInstance]);
};

export const useUnselectInstance = () => {
  const [, setSelectedInstance] = useSelectedInstance();
  useSubscribe("unselectInstance", () => {
    setSelectedInstance(undefined);
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
