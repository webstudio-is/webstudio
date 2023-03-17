import produce from "immer";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/project-build";
import { theme, Flex } from "@webstudio-is/design-system";
import { utils } from "@webstudio-is/project";
import {
  useRootInstance,
  useDragAndDropState,
  instancesIndexStore,
} from "~/shared/nano-states";
import { InstanceTreeNode } from "~/builder/shared/tree";
import {
  createInstancesIndex,
  getInstanceAncestorsAndSelf,
  insertInstanceMutableDeprecated,
  reparentInstanceMutableDeprecated,
} from "~/shared/tree-utils";

export const TreePrevew = () => {
  const [rootInstance] = useRootInstance();
  const instancesIndex = useStore(instancesIndexStore);
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

    const { instancesById } = instancesIndex;
    const isNew = instancesById.get(dragItemInstance.id) === undefined;

    const instance: Instance = produce<Instance>((draft) => {
      const instancesIndex = createInstancesIndex(draft);
      if (isNew) {
        insertInstanceMutableDeprecated(
          instancesIndex,
          utils.tree.createInstance({ component: dragItemInstance.component }),
          {
            parentId: dropTargetInstanceId,
            position: dropTargetPosition,
          }
        );
      } else {
        reparentInstanceMutableDeprecated(instancesIndex, dragItemInstance.id, {
          parentId: dropTargetInstanceId,
          position: dropTargetPosition,
        });
      }
    })(rootInstance);

    const dropTargetPath = getInstanceAncestorsAndSelf(
      instancesIndex,
      dropTargetInstanceId
    ).map((item) => item.id);

    return {
      itemData: instance,
      selectedItemId: dragItemInstance.id,
      getIsExpanded: (instance: Instance) =>
        dropTargetPath.includes(instance.id),
      animate: false,
    };
  }, [
    rootInstance,
    instancesIndex,
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
