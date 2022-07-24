import produce from "immer";
import { useMemo } from "react";
import { Tree } from "~/designer/shared/tree";
import { Flex } from "~/shared/design-system";
import { useRootInstance, useDragAndDropState } from "~/shared/nano-states";
import {
  // findInstanceById,
  getInstancePath,
  insertInstanceMutable,
  deleteInstanceMutable,
} from "~/shared/tree-utils";

export const TreePrevew = () => {
  const [rootInstance] = useRootInstance();
  const [dragAndDropState] = useDragAndDropState();

  // const [draftRootInstance, setDraftRootInstance] = useState(rootInstance);
  // const [instanceId, setInstanceId] = useState<Instance["id"]>();

  // useSubscribe<"dropPreview", { dragData: DragData; dropData: DropData }>(
  //   "dropPreview",
  //   ({ dragData, dropData }) => {
  //     if (rootInstance === undefined) return;
  //     setInstanceId(dragData.instance.id);

  //     const isNew =
  //       findInstanceById(rootInstance, dragData.instance.id) === undefined;

  //     const updatedRootInstance = produce((rootInstanceDraft) => {
  //       // - Only delete if the instance existed before.
  //       // - Can't reparent an instance inside itself.
  //       if (isNew === false && dropData.instance.id !== dragData.instance.id) {
  //         deleteInstanceMutable(rootInstanceDraft, dragData.instance.id);
  //       }
  //       insertInstanceMutable(rootInstanceDraft, dragData.instance, {
  //         parentId: dropData.instance.id,
  //         position: dropData.position,
  //       });
  //     })(rootInstance);
  //     setDraftRootInstance(updatedRootInstance);
  //   }
  // );

  const dragItemInstance = dragAndDropState.dragItem?.instance;
  const dropTargetInstanceId = dragAndDropState.dropTarget?.instanceId;
  const dropTargetPosition = dragAndDropState.dropTarget?.position;

  const draftRootInstance = useMemo(() => {
    if (
      dragItemInstance === undefined ||
      dropTargetInstanceId === undefined ||
      dropTargetPosition === undefined
    ) {
      return rootInstance;
    }

    return produce((draft) => {
      deleteInstanceMutable(draft, dragItemInstance.id);
      insertInstanceMutable(draft, dragItemInstance, {
        parentId: dropTargetInstanceId,
        position: dropTargetPosition,
      });
    })(rootInstance);
  }, [
    rootInstance,
    dragItemInstance,
    dropTargetInstanceId,
    dropTargetPosition,
  ]);

  if (draftRootInstance === undefined || dragItemInstance === undefined) {
    return null;
  }

  const selectedInstancePath = getInstancePath(
    draftRootInstance,
    dragItemInstance.id
  );

  if (selectedInstancePath.length === 0) return null;

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Tree
        instance={draftRootInstance}
        selectedInstancePath={selectedInstancePath}
        selectedInstanceId={dragItemInstance.id}
        animate={false}
      />
    </Flex>
  );
};
