import { useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Flex, type ItemDropTarget } from "@webstudio-is/design-system";
import {
  rootInstanceStore,
  selectedInstanceSelectorStore,
  hoveredInstanceSelectorStore,
  useDragAndDropState,
  instancesStore,
} from "~/shared/nano-states";
import { InstanceTree } from "~/builder/shared/tree";
import { reparentInstance } from "~/shared/instance-utils";
import { getInstanceSelector, InstanceSelector } from "~/shared/tree-utils";
import { Header, CloseButton } from "../header";

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const Navigator = ({ isClosable, onClose }: NavigatorProps) => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const instances = useStore(instancesStore);
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
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="Navigator"
        suffix={isClosable && <CloseButton onClick={() => onClose?.()} />}
      />
      <Flex css={{ flexGrow: 1, flexDirection: "column" }}>
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
      </Flex>
    </Flex>
  );
};
