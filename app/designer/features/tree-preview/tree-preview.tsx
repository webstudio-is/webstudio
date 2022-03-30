import { Instance, useSubscribe } from "@webstudio-is/sdk";
import produce from "immer";
import { useState } from "react";
import { useRootInstance } from "~/designer/shared/nano-values";
import { Tree } from "~/designer/shared/tree";
import { type DragData, type DropData } from "~/shared/component";
import { Flex } from "~/shared/design-system";
import {
  findInstanceById,
  getInstancePath,
  insertInstanceMutable,
  reparentInstance,
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

      if (isNew) {
        const updatedRootInstance = produce((rootInstanceDraft) => {
          insertInstanceMutable(rootInstanceDraft, dragData.instance, {
            parentId: dropData.instance.id,
            position: dropData.position,
          });
        })(rootInstance);
        setDraftRootInstance(updatedRootInstance);
        return;
      }

      // Can't reparent an instance inside itself
      if (dropData.instance.id === dragData.instance.id) {
        return;
      }

      const instanceReparentingSpec = {
        parentId: dropData.instance.id,
        position: dropData.position,
        id: dragData.instance.id,
      };
      const updatedRootInstance = reparentInstance(
        rootInstance,
        instanceReparentingSpec
      );
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
