import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  hoveredInstanceSelectorStore,
  rootInstanceStore,
  selectedInstanceSelectorStore,
  useDragAndDropState,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import { InstanceTree } from "./tree";
import { reparentInstance } from "~/shared/instance-utils";

export const NavigatorTree = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const rootInstance = useStore(rootInstanceStore);
  const [state, setState] = useDragAndDropState();

  const dragItemSelector =
    state.dragPayload?.type === "reparent"
      ? state.dragPayload.dragInstanceSelector
      : undefined;

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
      dropTarget={state.dropTarget}
      onSelect={selectedInstanceSelectorStore.set}
      onHover={hoveredInstanceSelectorStore.set}
      onDragItemChange={(dragInstanceSelector) => {
        setState({
          ...state,
          dragPayload: { type: "reparent", dragInstanceSelector },
        });
      }}
      onDropTargetChange={(dropTarget) => {
        setState({ ...state, dropTarget });
      }}
      onDragEnd={handleDragEnd}
    />
  );
};
