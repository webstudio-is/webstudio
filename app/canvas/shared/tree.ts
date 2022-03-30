import { useEffect } from "react";
import { type Instance, type Tree } from "@webstudio-is/sdk";
import {
  deleteInstanceMutable,
  populateInstance,
  findParentInstance,
  findClosestSiblingInstance,
  insertInstanceMutable,
} from "~/shared/tree-utils";
import { createTransaction } from "~/lib/sync-engine";
import { DropData } from "~/shared/component";
import {
  rootInstanceContainer,
  useRootInstance,
  useSelectedInstance,
} from "./nano-values";
import { useSubscribe } from "./pubsub";

export const usePopulateRootInstance = (tree: Tree) => {
  const [, setRootInstance] = useRootInstance();
  useEffect(() => {
    setRootInstance(tree.root);
  }, [tree, setRootInstance]);
};

export const useInsertInstance = () => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  useSubscribe<"insertInstance", { instance: Instance; dropData?: DropData }>(
    "insertInstance",
    ({ instance, dropData }) => {
      createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) return;
        const populatedInstance = populateInstance(instance);
        const hasInserted = insertInstanceMutable(
          rootInstance,
          populatedInstance,
          {
            parentId:
              dropData?.instance.id ?? selectedInstance?.id ?? rootInstance.id,
            position: dropData?.position || "end",
          }
        );
        if (hasInserted) {
          setSelectedInstance(instance);
        }
      });
    }
  );
};

export const useReparentInstance = () => {
  useSubscribe<"reparentInstance", { instance: Instance; dropData: DropData }>(
    "reparentInstance",
    ({ instance, dropData }) => {
      createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) return;
        deleteInstanceMutable(rootInstance, instance.id);
        insertInstanceMutable(rootInstance, instance, {
          parentId: dropData.instance.id,
          position: dropData.position,
        });
      });
    }
  );
};

export const useDeleteInstance = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  useSubscribe<"deleteInstance", { id: Instance["id"] }>(
    "deleteInstance",
    ({ id }) => {
      if (rootInstance !== undefined && selectedInstance !== undefined) {
        const parentInstance = findParentInstance(rootInstance, id);
        if (parentInstance !== undefined) {
          const siblingInstance = findClosestSiblingInstance(
            parentInstance,
            id
          );
          setSelectedInstance(siblingInstance || parentInstance);
        }
      }
      // @todo deleting instance should involve also deleting it's props
      // If we don't delete them - they just live both on client and db
      // Pros:
      //   - if we undo the deletion we don't need to undo the props deletion
      //   - in a multiplayer environment, some other user could have changed a prop while we have deleted the instance
      // and then if we restore the instance, we would be restoring it with our props, potentially overwriting other users changes
      // The way it is now it will actually still enable parallel deletion props editing and restoration.
      // Contra: we are piling them up.
      // Potentially we could also solve this by periodically removing unused props after while when instance was deleted
      createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance !== undefined) {
          deleteInstanceMutable(rootInstance, id);
        }
      });
    }
  );
};
