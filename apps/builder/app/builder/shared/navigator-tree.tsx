import { useCallback } from "react";
import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/project-build";
import {
  hoveredInstanceSelectorStore,
  instancesStore,
  rootInstanceStore,
  selectedInstanceSelectorStore,
  useDragAndDropState,
  textEditingInstanceSelectorStore,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import { reparentInstance } from "~/shared/instance-utils";
import { InstanceTree } from "./tree";
import { shallowEqual } from "shallow-equal";

export const NavigatorTree = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const rootInstance = useStore(rootInstanceStore);
  const instances = useStore(instancesStore);
  const [state, setState] = useDragAndDropState();

  const dragItemSelector =
    state.dragPayload?.type === "reparent"
      ? state.dragPayload.dragInstanceSelector
      : undefined;

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
      onCancel={() => {
        setState({ isDragging: false });
      }}
    />
  );
};
