import produce from "immer";
import { type Instance } from "@webstudio-is/react-sdk";
import { useMemo } from "react";
import { Tree } from "~/designer/shared/tree";
import { Flex } from "@webstudio-is/design-system";
import { useRootInstance, useDragAndDropState } from "~/shared/nano-states";
import { getInstancePath, reparentInstanceMutable } from "~/shared/tree-utils";

export const TreePrevew = () => {
  const [rootInstance] = useRootInstance();
  const [dragAndDropState] = useDragAndDropState();

  const dragItemInstanceId = dragAndDropState.dragItem?.instanceId;
  const dropTargetInstanceId = dragAndDropState.dropTarget?.instanceId;
  const dropTargetPosition = dragAndDropState.dropTarget?.position;

  const treeProps = useMemo(() => {
    if (
      dragItemInstanceId === undefined ||
      dropTargetInstanceId === undefined ||
      dropTargetPosition === undefined
    ) {
      return null;
    }

    const instance: Instance = produce((draft) => {
      reparentInstanceMutable(
        draft,
        dragItemInstanceId,
        dropTargetInstanceId,
        dropTargetPosition
      );
    })(rootInstance);

    return {
      instance,
      selectedInstanceId: dragItemInstanceId,
      selectedInstancePath: getInstancePath(instance, dragItemInstanceId),
    };
  }, [
    rootInstance,
    dragItemInstanceId,
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
