import { Instance, useSubscribe } from "@webstudio-is/sdk";
import produce from "immer";
import { useState } from "react";
import { Tree } from "~/designer/shared/tree";
import { type DragData, type DropData } from "~/shared/component";
import { Flex } from "~/shared/design-system";
import { useRootInstance } from "~/shared/nano-states";
import {
  findInstanceById,
  getInstancePath,
  insertInstanceMutable,
  deleteInstanceMutable,
} from "~/shared/tree-utils";

export const TreePrevew = () => {
  const [rootInstance] = useRootInstance();
  const [draftRootInstance, setDraftRootInstance] = useState(rootInstance);
  const [instanceId, setInstanceId] = useState<Instance["id"]>();

  useSubscribe<"dropPreview", { dragData: DragData; dropData: DropData }>(
    "dropPreview",
    ({ dragData, dropData }) => {
      if (rootInstance === undefined) return;
      setInstanceId(dragData.instance.id);

      const isNew =
        findInstanceById(rootInstance, dragData.instance.id) === undefined;

      const updatedRootInstance = produce((rootInstanceDraft) => {
        // - Only delete if the instance existed before.
        // - Can't reparent an instance inside itself.
        if (isNew === false && dropData.instance.id !== dragData.instance.id) {
          deleteInstanceMutable(rootInstanceDraft, dragData.instance.id);
        }
        insertInstanceMutable(rootInstanceDraft, dragData.instance, {
          parentId: dropData.instance.id,
          position: dropData.position,
        });
      })(rootInstance);
      setDraftRootInstance(updatedRootInstance);
    }
  );

  if (draftRootInstance === undefined || instanceId === undefined) {
    return null;
  }

  const selectedInstancePath = getInstancePath(draftRootInstance, instanceId);

  if (selectedInstancePath.length === 0) return null;

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Tree
        instance={draftRootInstance}
        selectedInstancePath={selectedInstancePath}
        selectedInstanceId={instanceId}
        animate={false}
      />
    </Flex>
  );
};
