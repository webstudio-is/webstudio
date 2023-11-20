import { useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { shallowEqual } from "shallow-equal";
import { toast } from "@webstudio-is/design-system";
import {
  hoveredInstanceSelectorStore,
  instancesStore,
  rootInstanceStore,
  selectedInstanceSelectorStore,
  textEditingInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  registeredComponentMetasStore,
  $dragAndDropState,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import {
  computeInstancesConstraints,
  findClosestDroppableComponentIndex,
  reparentInstance,
  type InsertConstraints,
  isInstanceDetachable,
  getComponentTemplateData,
} from "~/shared/instance-utils";
import { InstanceTree } from "./tree";

export const NavigatorTree = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const rootInstance = useStore(rootInstanceStore);
  const instances = useStore(instancesStore);
  const metas = useStore(registeredComponentMetasStore);
  const state = useStore($dragAndDropState);

  const dragPayload = state.dragPayload;

  const dragItemSelector =
    dragPayload?.type === "reparent"
      ? dragPayload.dragInstanceSelector
      : undefined;

  const insertConstraints: undefined | InsertConstraints = useMemo(() => {
    if (dragPayload?.type === "insert") {
      const templateData = getComponentTemplateData(dragPayload.dragComponent);
      if (templateData) {
        const { children, instances } = templateData;
        const newInstances = new Map(
          instances.map((instance) => [instance.id, instance])
        );
        const rootInstanceIds = children
          .filter((child) => child.type === "id")
          .map((child) => child.value);
        return computeInstancesConstraints(
          metas,
          newInstances,
          rootInstanceIds
        );
      }
    }
    if (dragPayload?.type === "reparent") {
      return computeInstancesConstraints(metas, instances, [
        dragPayload.dragInstanceSelector[0],
      ]);
    }
  }, [dragPayload, instances, metas]);

  const findClosestDroppableIndex = useCallback(
    (instanceSelector: InstanceSelector) => {
      if (insertConstraints === undefined) {
        return -1;
      }
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
        insertConstraints
      );
    },
    [instances, metas, insertConstraints]
  );

  const isItemHidden = useCallback(
    ([instanceId]: InstanceSelector) =>
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
      $dragAndDropState.set({ isDragging: false });
    },
    []
  );

  const handleSelect = useCallback((instanceSelector: InstanceSelector) => {
    // TreeNode is refocused during "delete" hot key here https://github.com/webstudio-is/webstudio/blob/5935d7818fba3739e4f16fe710ea468bf9d0ac78/packages/design-system/src/components/tree/tree.tsx#L435
    // and then focus cause handleSelect to be called with the same instanceSelector
    // This avoids additional rerender on node delete
    if (shallowEqual(selectedInstanceSelectorStore.get(), instanceSelector)) {
      return;
    }
    selectedInstanceSelectorStore.set(instanceSelector);
    textEditingInstanceSelectorStore.set(undefined);
    selectedStyleSourceSelectorStore.set(undefined);
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
        if (isInstanceDetachable(dragInstanceSelector) === false) {
          toast.error(
            "This instance can not be moved outside of its parent component."
          );
          return;
        }
        $dragAndDropState.set({
          ...$dragAndDropState.get(),
          dragPayload: {
            origin: "panel",
            type: "reparent",
            dragInstanceSelector,
          },
        });
      }}
      onDropTargetChange={(dropTarget) => {
        $dragAndDropState.set({ ...$dragAndDropState.get(), dropTarget });
      }}
      onDragEnd={handleDragEnd}
      onCancel={() => {
        $dragAndDropState.set({ isDragging: false });
      }}
    />
  );
};
