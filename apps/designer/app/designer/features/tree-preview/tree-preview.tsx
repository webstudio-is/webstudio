import produce from "immer";
import { type Instance } from "@webstudio-is/react-sdk";
import { useMemo } from "react";
import { TreeNode } from "~/designer/shared/tree";
import { Flex } from "@webstudio-is/design-system";
import { useRootInstance, useDragAndDropState } from "~/shared/nano-states";
import {
  reparentInstanceMutable,
  insertInstanceMutable,
  createInstance,
  findInstanceById,
  getInstancePath,
} from "~/shared/tree-utils";

export const TreePrevew = () => {
  const [rootInstance] = useRootInstance();
  const [dragAndDropState] = useDragAndDropState();

  const dragItemInstance = dragAndDropState.dragItem;
  const dropTargetInstanceId = dragAndDropState.dropTarget?.instance.id;
  const dropTargetPosition = dragAndDropState.dropTarget?.position;

  const treeProps = useMemo(() => {
    if (
      dragItemInstance === undefined ||
      dropTargetInstanceId === undefined ||
      dropTargetPosition === undefined ||
      rootInstance === undefined
    ) {
      return null;
    }

    const isNew =
      findInstanceById(rootInstance, dragItemInstance.id) === undefined;

    const instance: Instance = produce((draft) => {
      if (isNew) {
        insertInstanceMutable(
          draft,
          createInstance({ component: dragItemInstance.component }),
          {
            parentId: dropTargetInstanceId,
            position: dropTargetPosition,
          }
        );
      } else {
        reparentInstanceMutable(
          draft,
          dragItemInstance.id,
          dropTargetInstanceId,
          dropTargetPosition
        );
      }
    })(rootInstance);

    const dropTargetPath = getInstancePath(
      rootInstance,
      dropTargetInstanceId
    ).map((item) => item.id);

    return {
      instance,
      selectedInstanceId: dragItemInstance.id,
      getIsExpanded: (instance: Instance) =>
        dropTargetPath.includes(instance.id),
      animate: false,
    };
  }, [
    rootInstance,
    dragItemInstance,
    dropTargetInstanceId,
    dropTargetPosition,
  ]);

  return (
    treeProps && (
      <Flex direction="column" css={{ pt: "$1", pb: "$1", width: "100%" }}>
        <TreeNode {...treeProps} />
      </Flex>
    )
  );
};
