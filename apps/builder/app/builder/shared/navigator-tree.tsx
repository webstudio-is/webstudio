import { useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { shallowEqual } from "shallow-equal";
import {
  findTreeInstanceIds,
  type Instance,
} from "@webstudio-is/project-build";
import {
  hoveredInstanceSelectorStore,
  instancesStore,
  rootInstanceStore,
  selectedInstanceSelectorStore,
  useDragAndDropState,
  textEditingInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  registeredComponentMetasStore,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import {
  findClosestDroppableComponentIndex,
  reparentInstance,
} from "~/shared/instance-utils";
import { InstanceTree } from "./tree";
import { generateDataFromEmbedTemplate } from "@webstudio-is/react-sdk";

export const NavigatorTree = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const rootInstance = useStore(rootInstanceStore);
  const instances = useStore(instancesStore);
  const metas = useStore(registeredComponentMetasStore);
  const [state, setState] = useDragAndDropState();

  const dragPayload = state.dragPayload;

  const dragItemSelector =
    dragPayload?.type === "reparent"
      ? dragPayload.dragInstanceSelector
      : undefined;

  // collect components of drag component and all its descendants
  const dragComponents = useMemo(() => {
    const dragComponents = new Set<Instance["component"]>();
    if (dragPayload?.type === "insert") {
      const template = metas.get(dragPayload.dragComponent)?.template;
      if (template) {
        // ignore breakpoint, here only instances are important
        // @todo optimize by traversing only instances
        const { instances } = generateDataFromEmbedTemplate(
          template,
          "__placeholder__"
        );
        for (const instance of instances) {
          dragComponents.add(instance.component);
        }
      }
    }
    if (dragPayload?.type === "reparent") {
      const instanceIds = findTreeInstanceIds(
        instances,
        dragPayload.dragInstanceSelector[0]
      );
      for (const instanceId of instanceIds) {
        const instance = instances.get(instanceId);
        if (instance) {
          dragComponents.add(instance.component);
        }
      }
    }
    return Array.from(dragComponents);
  }, [dragPayload, instances, metas]);

  const findClosestDroppableIndex = useCallback(
    (instanceSelector: InstanceSelector) => {
      const componentSelector: string[] = [];
      for (const instanceId of instanceSelector) {
        const component = instances.get(instanceId)?.component;
        if (component === undefined) {
          return -1;
        }
        componentSelector.push(component);
      }
      return findClosestDroppableComponentIndex(
        metas,
        componentSelector,
        dragComponents
      );
    },
    [instances, metas, dragComponents]
  );

  const isItemHidden = useCallback(
    (instanceId: Instance["id"]) =>
      // fragment is internal component to group other instances
      // for example to support multiple children in slots
      instances.get(instanceId)?.component === "Fragment",
    [instances]
  );

  const handleDragEnd = useCallback(
    (payload: {
      itemSelector: InstanceSelector;
      dropTarget: { itemSelector: InstanceSelector; position: number | "end" };
    }) => {
      reparentInstance(payload.itemSelector, {
        parentSelector: payload.dropTarget.itemSelector,
        position: payload.dropTarget.position,
      });
      setState({ isDragging: false });
    },
    [setState]
  );

  const handleSelect = useCallback((instanceSelector: InstanceSelector) => {
    // TreeNode is refocused during "delete" hot key here https://github.com/webstudio-is/webstudio-builder/blob/5935d7818fba3739e4f16fe710ea468bf9d0ac78/packages/design-system/src/components/tree/tree.tsx#L435
    // and then focus cause handleSelect to be called with the same instanceSelector
    // This avoids additional rerender on node delete
    if (
      shallowEqual(selectedInstanceSelectorStore.get(), instanceSelector) ===
      false
    ) {
      selectedInstanceSelectorStore.set(instanceSelector);
      textEditingInstanceSelectorStore.set(undefined);
      selectedStyleSourceSelectorStore.set(undefined);
    }
  }, []);

  if (rootInstance === undefined) {
    return null;
  }

  return (
    <InstanceTree
      root={rootInstance}
      selectedItemSelector={selectedInstanceSelector}
      dragItemSelector={dragItemSelector}
      dropTarget={state.dropTarget}
      isItemHidden={isItemHidden}
      findClosestDroppableIndex={findClosestDroppableIndex}
      onSelect={handleSelect}
      onHover={hoveredInstanceSelectorStore.set}
      onDragItemChange={(dragInstanceSelector) => {
        setState((state) => ({
          ...state,
          dragPayload: {
            origin: "panel",
            type: "reparent",
            dragInstanceSelector,
          },
        }));
      }}
      onDropTargetChange={(dropTarget) => {
        setState((state) => ({ ...state, dropTarget }));
      }}
      onDragEnd={handleDragEnd}
      onCancel={() => {
        setState({ isDragging: false });
      }}
    />
  );
};
