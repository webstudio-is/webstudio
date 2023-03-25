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
import { textEditingInstanceSelectorStore } from "~/shared/nano-states/instances";

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
      reparentInstance(payload.itemSelector, {
        parentSelector: payload.dropTarget.itemSelector,
        position: payload.dropTarget.position,
      });
    },
    []
  );

  const handleSelect = useCallback((instanceSelector: InstanceSelector) => {
    selectedInstanceSelectorStore.set(instanceSelector);
    textEditingInstanceSelectorStore.set(undefined);
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
      onSelect={handleSelect}
      onHover={hoveredInstanceSelectorStore.set}
      onDragItemChange={(dragInstanceSelector) => {
        setState({
          ...state,
          dragPayload: {
            origin: "panel",
            type: "reparent",
            dragInstanceSelector,
          },
        });
      }}
      onDropTargetChange={(dropTarget) => {
        setState({ ...state, dropTarget });
      }}
      onDragEnd={handleDragEnd}
    />
  );
};
