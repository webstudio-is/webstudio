import { useEffect, useRef } from "react";
import { type Instance, type Tree } from "@webstudio-is/sdk";
import {
  type InstanceInsertionSpec,
  type InstanceReparentingSpec,
  insertInstance,
  reparentInstance,
  deleteInstanceMutable,
} from "~/shared/tree-utils";
import {
  rootInstanceContainer,
  useRootInstance,
  useSelectedInstance,
} from "./nano-values";
import { useSubscribe } from "./pubsub";
import { createTransaction } from "~/lib/sync-engine";
import { findParentInstance } from "~/shared/tree-utils/find-parent-instance";
import { findClosestSiblingInstance } from "~/shared/tree-utils/find-closest-sibling-instance";

export const usePopulateRootInstance = (tree: Tree) => {
  const [, setRootInstance] = useRootInstance();
  useEffect(() => {
    setRootInstance(tree.root);
  }, [tree, setRootInstance]);
};

export const useInsertInstance = ({
  instanceInsertionSpec,
}: {
  instanceInsertionSpec?: InstanceInsertionSpec;
}) => {
  const [rootInstance, setRootInstance] = useRootInstance();
  const [, setSelectedInstance] = useSelectedInstance();
  const previousInstanceInsertionSpecRef = useRef<InstanceInsertionSpec>();

  useEffect(() => {
    if (instanceInsertionSpec === undefined || rootInstance === undefined) {
      return;
    }
    // Preventing an infinite insertion loop
    if (previousInstanceInsertionSpecRef.current === instanceInsertionSpec) {
      return;
    }
    previousInstanceInsertionSpecRef.current = instanceInsertionSpec;
    const { instance: updatedRoot, insertedInstance } = insertInstance(
      instanceInsertionSpec,
      rootInstance
    );
    setRootInstance(updatedRoot);
    if (insertedInstance !== undefined) {
      setSelectedInstance(insertedInstance);
    }
  }, [
    instanceInsertionSpec,
    rootInstance,
    setRootInstance,
    setSelectedInstance,
  ]);
};

export const useReparentInstance = ({
  instanceReparentingSpec,
}: {
  instanceReparentingSpec?: InstanceReparentingSpec;
}) => {
  const [rootInstance, setRootInstance] = useRootInstance();
  // Used to avoid reparenting in infinite loop when spec didn't change
  const usedSpec = useRef<InstanceReparentingSpec>();

  useEffect(() => {
    if (
      rootInstance === undefined ||
      instanceReparentingSpec === undefined ||
      usedSpec.current === instanceReparentingSpec
    ) {
      return;
    }
    usedSpec.current = instanceReparentingSpec;
    const updatedRootInstance = reparentInstance(
      rootInstance,
      instanceReparentingSpec
    );
    setRootInstance(updatedRootInstance);
  }, [instanceReparentingSpec, rootInstance, setRootInstance]);
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
