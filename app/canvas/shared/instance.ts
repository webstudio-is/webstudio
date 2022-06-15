import { useCallback, useEffect, useMemo } from "react";
import ObjectId from "bson-objectid";
import {
  type InstanceProps,
  type Instance,
  type Tree,
  allUserPropsContainer,
  getBrowserStyle,
  useAllUserProps,
  useSubscribe,
  publish,
} from "@webstudio-is/sdk";
import {
  deleteInstanceMutable,
  populateInstance,
  findParentInstance,
  findClosestSiblingInstance,
  insertInstanceMutable,
  findInstanceById,
} from "~/shared/tree-utils";
import store from "immerhin";
import {
  DropData,
  HoveredInstanceData,
  type SelectedInstanceData,
} from "~/shared/canvas-components";
import {
  useSelectedInstance,
  useSelectedElement,
  useHoveredElement,
  useHoveredInstance,
} from "./nano-states";
import { rootInstanceContainer, useRootInstance } from "~/shared/nano-states";
import { useOnRender } from "./use-on-render";
import { useWindowResize } from "~/shared/dom-hooks";

export const usePopulateRootInstance = (tree: Tree) => {
  const [, setRootInstance] = useRootInstance();
  useEffect(() => {
    setRootInstance(tree.root);
  }, [tree, setRootInstance]);
};

export const useInsertInstance = () => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  useSubscribe<
    "insertInstance",
    { instance: Instance; dropData?: DropData; props?: InstanceProps }
  >("insertInstance", ({ instance, dropData, props }) => {
    store.createTransaction(
      [rootInstanceContainer, allUserPropsContainer],
      (rootInstance, allUserProps) => {
        if (rootInstance === undefined) return;
        const populatedInstance = populateInstance(instance);
        const hasInserted = insertInstanceMutable(
          rootInstance,
          populatedInstance,
          {
            parentId:
              dropData?.instance.id ?? selectedInstance?.id ?? rootInstance.id,
            position: dropData?.position || "end",
          }
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
  useSubscribe<"reparentInstance", { instance: Instance; dropData: DropData }>(
    "reparentInstance",
    ({ instance, dropData }) => {
      store.createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) return;
        deleteInstanceMutable(rootInstance, instance.id);
        insertInstanceMutable(rootInstance, instance, {
          parentId: dropData.instance.id,
          position: dropData.position,
        });
      });
    }
  );
};

export const useDeleteInstance = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  useSubscribe<"deleteInstance", { id: Instance["id"] }>(
    "deleteInstance",
    ({ id }) => {
      if (rootInstance !== undefined && selectedInstance !== undefined) {
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

/**
 *  We need to set the selected instance after a any root instance update,
 *  because anything that we change on the selected instance is actually done on the root, so
 *  when we run "undo", root is going to be undone but not the selected instance, unless we update it here.
 */
export const useUpdateSelectedInstance = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  useEffect(() => {
    if (rootInstance === undefined || selectedInstance === undefined) {
      return;
    }
    const nextSelectedInstance = findInstanceById(
      rootInstance,
      selectedInstance.id
    );
    if (nextSelectedInstance === undefined) return;
    setSelectedInstance(nextSelectedInstance);
  }, [rootInstance, selectedInstance, setSelectedInstance]);
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

export const usePublishSelectedInstanceDataRect = () => {
  const [element] = useSelectedElement();
  const publishRect = useCallback(() => {
    requestAnimationFrame(() => {
      if (element === undefined) return;
      publish<"selectedInstanceRect", DOMRect>({
        type: "selectedInstanceRect",
        payload: element.getBoundingClientRect(),
      });
    });
  }, [element]);
  useOnRender(publishRect);
  useWindowResize(publishRect);
  useEffect(publishRect, [publishRect]);
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
    if (rootInstance !== undefined && hoveredElement?.id) {
      instance = findInstanceById(rootInstance, hoveredElement.id);
    }
    setHoveredInstance(instance);
  }, [rootInstance, hoveredElement, setHoveredInstance]);
};

export const useSetSelectedInstance = () => {
  const [rootInstance] = useRootInstance();
  const [selectedElement] = useSelectedElement();
  const [, setSelectedInstance] = useSelectedInstance();

  useEffect(() => {
    let instance;
    if (rootInstance !== undefined && selectedElement?.id) {
      instance = findInstanceById(rootInstance, selectedElement.id);
    }
    setSelectedInstance(instance);
  }, [selectedElement, rootInstance]);
};

export const useUnselectInstance = () => {
  const [, setSelectedElement] = useSelectedElement();
  useSubscribe("unselectInstance", () => {
    setSelectedElement(undefined);
  });
};
