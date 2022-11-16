import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ObjectId from "bson-objectid";
import {
  type Instance,
  type InstanceProps,
  type Tree,
  components,
  allUserPropsContainer,
  getBrowserStyle,
  useAllUserProps,
} from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import {
  deleteInstanceMutable,
  populateInstance,
  findParentInstance,
  findClosestSiblingInstance,
  insertInstanceMutable,
  findInstanceById,
  reparentInstanceMutable,
  getInstancePathWithPositions,
  type InstanceInsertionSpec,
} from "~/shared/tree-utils";
import store from "immerhin";
import {
  HoveredInstanceData,
  type SelectedInstanceData,
} from "~/shared/canvas-components";
import {
  useSelectedInstance,
  useSelectedElement,
  useHoveredInstance,
} from "./nano-states";
import {
  rootInstanceContainer,
  useBreakpoints,
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { useMeasureInstance } from "~/canvas/shared/use-measure-instance";
import {
  findInstanceByElement,
  getInstanceElementById,
} from "~/shared/dom-utils";
import { publish } from "~/shared/pubsub";
import { useTrackHoveredElement } from "./use-track-hovered-element";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    hoveredInstanceRect: DOMRect;
    hoverInstance?: HoveredInstanceData;
    loadRootInstance?: Instance;
    selectedInstanceRect: DOMRect;
    selectInstance?: SelectedInstanceData;
    textEditingInstanceId?: Instance["id"];
    insertInstance: {
      instance: Instance;
      dropTarget?: { parentId: Instance["id"]; position: number };
      props?: InstanceProps;
    };
    unselectInstance: undefined;
  }
}

export const usePopulateRootInstance = (tree: Tree) => {
  // @todo ssr workaround for https://github.com/webstudio-is/webstudio-designer/issues/213
  const ref = useRef(false);
  // It is only set once when the canvas is first loaded.
  if (ref.current === false) {
    ref.current = true;
    rootInstanceContainer.value = tree.root;
  }
};

export const findInsertLocation = (
  rootInstance: Instance,
  selectedInstanceId: Instance["id"] | undefined
): InstanceInsertionSpec => {
  if (selectedInstanceId === undefined) {
    return { parentId: rootInstance.id, position: "end" };
  }

  const path = getInstancePathWithPositions(rootInstance, selectedInstanceId);
  path.reverse();

  const parentIndex = path.findIndex(
    ({ item }) => components[item.component].canAcceptChildren
  );

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
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [breakpoints] = useBreakpoints();

  useSubscribe("insertInstance", ({ instance, dropTarget, props }) => {
    store.createTransaction(
      [rootInstanceContainer, allUserPropsContainer],
      (rootInstance, allUserProps) => {
        if (rootInstance === undefined) return;
        const populatedInstance = populateInstance(instance, breakpoints[0].id);
        const hasInserted = insertInstanceMutable(
          rootInstance,
          populatedInstance,
          dropTarget ?? findInsertLocation(rootInstance, selectedInstance?.id)
        );
        if (hasInserted) {
          setSelectedInstance(instance);
        }
        if (props !== undefined) {
          allUserProps[props.instanceId] = props;
        }
      }
    );
  });
};

export const useReparentInstance = () => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  useSubscribe("reparentInstance", ({ instanceId, dropTarget }) => {
    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) return;
      reparentInstanceMutable(
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
        findInstanceById(rootInstanceContainer.value, instanceId)
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

      const parentInstance = findParentInstance(rootInstance, id);
      if (parentInstance !== undefined) {
        const siblingInstance = findClosestSiblingInstance(parentInstance, id);
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
        deleteInstanceMutable(rootInstance, id);
      }
    });
  });
};

export const usePublishSelectedInstanceData = (treeId: Tree["id"]) => {
  const [instance] = useSelectedInstance();
  const [selectedElement] = useSelectedElement();
  const [allUserProps] = useAllUserProps();
  const browserStyle = useMemo(
    () => getBrowserStyle(selectedElement),
    [selectedElement]
  );

  useEffect(() => {
    // Unselects the instance by `undefined`
    let payload;
    if (instance !== undefined) {
      let props = allUserProps[instance.id];
      if (props === undefined) {
        props = {
          id: ObjectId().toString(),
          instanceId: instance.id,
          treeId,
          props: [],
        };
      }
      payload = {
        id: instance.id,
        component: instance.component,
        cssRules: instance.cssRules,
        browserStyle,
        props,
      };
    }
    publish({
      type: "selectInstance",
      payload,
    });
  }, [instance, allUserProps, treeId, browserStyle]);
};

export const usePublishHoveredInstanceData = () => {
  const [instance] = useHoveredInstance();

  useEffect(() => {
    const payload = instance
      ? {
          id: instance.id,
          component: instance.component,
        }
      : undefined;
    publish({
      type: "hoverInstance",
      payload,
    });
  }, [instance]);
};

export const usePublishRootInstance = () => {
  const [rootInstance] = useRootInstance();
  useEffect(() => {
    publish({
      type: "loadRootInstance",
      payload: rootInstance,
    });
  }, [rootInstance]);
};

const publishRect = (rect: DOMRect) => {
  publish({
    type: "selectedInstanceRect",
    payload: rect,
  });
};

export const usePublishSelectedInstanceDataRect = () => {
  const [element] = useSelectedElement();
  const rect = useMeasureInstance(element);

  useEffect(() => {
    if (rect) publishRect(rect);
  }, [rect]);
};

export const useSetHoveredInstance = () => {
  const [rootInstance] = useRootInstance();
  const [, setHoveredInstance] = useHoveredInstance();

  const [hoveredElement, setHoveredElement] = useState<HTMLElement | undefined>(
    undefined
  );

  useTrackHoveredElement(setHoveredElement);

  useSubscribe(
    "navigatorHoveredInstance",
    useCallback((instance) => {
      setHoveredElement(
        instance && (getInstanceElementById(instance.id) || undefined)
      );
    }, [])
  );

  useEffect(() => {
    if (hoveredElement === undefined) return;
    publish({
      type: "hoveredInstanceRect",
      payload: hoveredElement.getBoundingClientRect(),
    });
  }, [hoveredElement]);

  useEffect(() => {
    let instance;
    if (rootInstance !== undefined && hoveredElement) {
      instance = findInstanceByElement(rootInstance, hoveredElement);
    }
    setHoveredInstance(instance);
  }, [rootInstance, hoveredElement, setHoveredInstance]);
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
      instance = findInstanceById(rootInstance, selectedInstance.id);
    }
    // When it's a new inserted instance, it will be undefined, so we can't set it to undefined and remove it.
    if (instance !== undefined) setSelectedInstance(instance);
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
