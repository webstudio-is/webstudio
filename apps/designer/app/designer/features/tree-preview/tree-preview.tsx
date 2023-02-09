import produce from "immer";
import { useMemo } from "react";
import type { Instance } from "@webstudio-is/project-build";
import { theme, Flex } from "@webstudio-is/design-system";
import { utils } from "@webstudio-is/project";
import { useRootInstance, useDragAndDropState } from "~/shared/nano-states";
import { InstanceTreeNode } from "~/designer/shared/tree";
import {
  createInstancesIndex,
  reparentInstanceMutable,
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
      utils.tree.findInstanceById(rootInstance, dragItemInstance.id) ===
      undefined;

    const instance: Instance = produce<Instance>((draft) => {
      const instancesIndex = createInstancesIndex(draft);
      if (isNew) {
        utils.tree.insertInstanceMutable(
          draft,
          utils.tree.createInstance({ component: dragItemInstance.component }),
          {
            parentId: dropTargetInstanceId,
            position: dropTargetPosition,
          }
        );
      } else {
        reparentInstanceMutable(instancesIndex, dragItemInstance.id, {
          parentId: dropTargetInstanceId,
          position: dropTargetPosition,
        });
      }
    })(rootInstance);

    const dropTargetPath = utils.tree
      .getInstancePath(rootInstance, dropTargetInstanceId)
      .map((item) => item.id);

    return {
      itemData: instance,
      selectedItemId: dragItemInstance.id,
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
      <Flex
        direction="column"
        css={{ pt: theme.spacing[3], pb: theme.spacing[3], width: "100%" }}
      >
        <InstanceTreeNode {...treeProps} />
      </Flex>
    )
  );
};
