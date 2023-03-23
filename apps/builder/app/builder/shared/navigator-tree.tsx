import { useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  hoveredInstanceSelectorStore,
  instancesStore,
  rootInstanceStore,
  selectedInstanceSelectorStore,
  useDragAndDropState,
} from "~/shared/nano-states";
import { getInstanceSelector, InstanceSelector } from "~/shared/tree-utils";
import { InstanceTree } from "./tree";
import type { ItemDropTarget } from "@webstudio-is/design-system";
import { reparentInstance } from "~/shared/instance-utils";

export const NavigatorTree = () => {
  const instances = useStore(instancesStore);
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const rootInstance = useStore(rootInstanceStore);
  const [state, setState] = useDragAndDropState();

  const dragItemSelector = useMemo(() => {
    if (state.dragItem?.id === undefined) {
      return;
    }
    return getInstanceSelector(instances, state.dragItem.id);
  }, [state.dragItem, instances]);

  const dropTarget = useMemo((): undefined | ItemDropTarget => {
    if (state.dropTarget === undefined) {
      return;
    }
    return {
      placement: state.dropTarget.placement,
      indexWithinChildren: state.dropTarget.position,
      itemSelector: getInstanceSelector(
        instances,
        state.dropTarget.instance.id
      ),
    };
  }, [state.dropTarget, instances]);

  const handleDragEnd = useCallback(
    (payload: {
      itemSelector: InstanceSelector;
      dropTarget: { itemSelector: InstanceSelector; position: number | "end" };
    }) => {
      reparentInstance(payload.itemSelector[0], {
        parentId: payload.dropTarget.itemSelector[0],
        position: payload.dropTarget.position,
      });
    },
    []
  );

  if (rootInstance === undefined) {
    return null;
  }

  return (
    <InstanceTree
      root={rootInstance}
      selectedItemSelector={selectedInstanceSelector}
      dragItemSelector={dragItemSelector}
      dropTarget={dropTarget}
      onSelect={selectedInstanceSelectorStore.set}
      onHover={hoveredInstanceSelectorStore.set}
      onDragItemChange={(dragItemSelector) => {
        const instances = instancesStore.get();
        const instance = instances.get(dragItemSelector[0]);
        if (instance === undefined) {
          return;
        }
        setState({ ...state, dragItem: instance });
      }}
      onDropTargetChange={(dropTarget) => {
        const instances = instancesStore.get();
        const instance = instances.get(dropTarget.itemSelector[0]);
        if (instance === undefined) {
          return;
        }
        setState({
          ...state,
          dropTarget: {
            placement: dropTarget.placement,
            position: dropTarget.indexWithinChildren,
            instance,
          },
        });
      }}
      onDragEnd={handleDragEnd}
    />
  );
};
