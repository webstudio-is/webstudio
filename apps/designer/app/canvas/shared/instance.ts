import { useCallback, useEffect, useMemo, useRef } from "react";
import ObjectId from "bson-objectid";
import {
  type InstanceProps,
  type Instance,
  type Tree,
  components,
  allUserPropsContainer,
  getBrowserStyle,
  useAllUserProps,
  useSubscribe,
  publish,
} from "@webstudio-is/react-sdk";
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
  useHoveredElement,
  useHoveredInstance,
} from "./nano-states";
import {
  rootInstanceContainer,
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { useMeasure } from "~/shared/dom-hooks";
import { findInstanceByElement } from "~/shared/dom-utils";

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

  useSubscribe<
    "insertInstance",
    {
      instance: Instance;
      dropTarget?: { parentId: Instance["id"]; position: number };
      props?: InstanceProps;
    }
  >("insertInstance", ({ instance, dropTarget, props }) => {
    store.createTransaction(
      [rootInstanceContainer, allUserPropsContainer],
      (rootInstance, allUserProps) => {
        if (rootInstance === undefined) return;
        const populatedInstance = populateInstance(instance);
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

  useSubscribe<
    "reparentInstance",
    {
      instanceId: Instance["id"];
      dropTarget: { instanceId: Instance["id"]; position: number | "end" };
    }
  >("reparentInstance", ({ instanceId, dropTarget }) => {
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
  useSubscribe<"deleteInstance", { id: Instance["id"] }>(
    "deleteInstance",
    ({ id }) => {
      if (rootInstance !== undefined && selectedInstance !== undefined) {
        // @todo tell user they can't delete root
        if (id === rootInstance.id) {
          return;
        }

        const parentInstance = findParentInstance(rootInstance, id);
        if (parentInstance !== undefined) {
          const siblingInstance = findClosestSiblingInstance(
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
          deleteInstanceMutable(rootInstance, id);
        }
      });
    }
  );
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
    publish<"selectInstance", SelectedInstanceData>({
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
    publish<"hoverInstance", HoveredInstanceData | undefined>({
      type: "hoverInstance",
      payload,
    });
  }, [instance]);
};

export const usePublishRootInstance = () => {
  const [rootInstance] = useRootInstance();
  useEffect(() => {
    publish<"loadRootInstance", Instance>({
      type: "loadRootInstance",
      payload: rootInstance,
    });
  }, [rootInstance]);
};

const publishRect = (rect: DOMRect) => {
  publish<"selectedInstanceRect", DOMRect>({
    type: "selectedInstanceRect",
    payload: rect,
  });
};

export const usePublishSelectedInstanceDataRect = () => {
  const [element] = useSelectedElement();
  const [refCallback, rect] = useMeasure();

  useEffect(() => {
    // Disconnect observer when there is no element.
    refCallback(element ?? null);
  }, [element, refCallback]);

  useEffect(() => {
    if (rect !== undefined) publishRect(rect);
  }, [rect]);
};

export const usePublishHoveredInstanceRect = () => {
  const [element] = useHoveredElement();
  const publishRect = useCallback(() => {
    if (element === undefined) return;
    publish<"hoveredInstanceRect", DOMRect>({
      type: "hoveredInstanceRect",
      payload: element.getBoundingClientRect(),
    });
  }, [element]);
  useEffect(publishRect, [publishRect]);
};

export const useSetHoveredInstance = () => {
  const [rootInstance] = useRootInstance();
  const [hoveredElement] = useHoveredElement();
  const [, setHoveredInstance] = useHoveredInstance();

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
    publish<"textEditingInstanceId", Instance["id"] | undefined>({
      type: "textEditingInstanceId",
      payload: editingInstanceId,
    });
  }, [editingInstanceId]);
};
