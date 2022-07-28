import produce from "immer";
import { type Instance } from "@webstudio-is/react-sdk";
import { useMemo } from "react";
import { Tree } from "~/designer/shared/tree";
import { Flex } from "@webstudio-is/design-system";
import { useRootInstance, useDragAndDropState } from "~/shared/nano-states";

import {
  getInstancePath,
  insertInstanceMutable,
  deleteInstanceMutable,
  findParentInstance,
} from "~/shared/tree-utils";

export const TreePrevew = () => {
  const [rootInstance] = useRootInstance();
  const [dragAndDropState] = useDragAndDropState();

  const dragItemInstance = dragAndDropState.dragItem?.instance;
  const dropTargetInstanceId = dragAndDropState.dropTarget?.instanceId;
  const dropTargetPosition = dragAndDropState.dropTarget?.position;

  const treeProps = useMemo(() => {
    if (
      dragItemInstance === undefined ||
      dropTargetInstanceId === undefined ||
      dropTargetPosition === undefined
    ) {
      return null;
    }

    const instance: Instance = produce((draft) => {
      const currentParent = findParentInstance(draft, dragItemInstance.id);

      // placement.index does not take into account the fact that the drag item will be removed.
      // we need to do this to account for it.
      //
      // @todo we need an util that can do reparenting with this adjustment
      let dropTargetPositionAdjusted = dropTargetPosition;
      if (
        currentParent !== undefined &&
        currentParent.id === dropTargetInstanceId
      ) {
        const currentPosition = currentParent.children.findIndex(
          (x) => typeof x !== "string" && x.id === dragItemInstance.id
        );
        if (currentPosition < dropTargetPosition) {
          dropTargetPositionAdjusted--;
        }
      }

      deleteInstanceMutable(draft, dragItemInstance.id);
      insertInstanceMutable(draft, dragItemInstance, {
        parentId: dropTargetInstanceId,
        position: dropTargetPositionAdjusted,
      });
    })(rootInstance);

    return {
      instance,
      selectedInstanceId: dragItemInstance.id,
      selectedInstancePath: getInstancePath(instance, dragItemInstance.id),
    };
  }, [
    rootInstance,
    dragItemInstance,
    dropTargetInstanceId,
    dropTargetPosition,
  ]);

  return (
    treeProps && (
      <Flex gap="3" direction="column" css={{ padding: "$1" }}>
        <Tree {...treeProps} animate={false} />
      </Flex>
    )
  );
};
