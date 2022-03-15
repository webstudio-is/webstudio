import { useEffect, useState, useMemo, useRef } from "react";
import { type Instance, type Tree } from "@webstudio-is/sdk";
import {
  type InstanceInsertionSpec,
  type InstanceReparentingSpec,
  populateTree,
  insertInstance,
  deleteInstance,
  reparentInstance,
} from "~/shared/tree-utils";
import { useSelectedInstance } from "../nano-values";
import { useSubscribe } from "../pubsub";

export const usePopulateRootInstance = (tree: Tree) => {
  // Caches initial population of the instance, won't be updated after.
  const populatedRootInstance = useMemo(() => {
    return populateTree(tree.root);
  }, [tree]);
  return useState<Instance>(populatedRootInstance);
};

export const useInsertInstance = ({
  instanceInsertionSpec,
  rootInstance,
  setRootInstance,
}: {
  instanceInsertionSpec?: InstanceInsertionSpec;
  rootInstance: Instance;
  setRootInstance: (instance: Instance) => void;
}) => {
  const [, setSelectedInstance] = useSelectedInstance();
  const previousInstanceInsertionSpecRef = useRef<InstanceInsertionSpec>();

  useEffect(() => {
    if (instanceInsertionSpec === undefined) return;
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
  rootInstance,
  setRootInstance,
}: {
  instanceReparentingSpec?: InstanceReparentingSpec;
  rootInstance: Instance;
  setRootInstance: (instance: Instance) => void;
}) => {
  // Used to avoid reparenting in infinite loop when spec didn't change
  const usedSpec = useRef<InstanceReparentingSpec>();

  useEffect(() => {
    if (
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

export const useDeleteInstance = ({
  rootInstance,
  setRootInstance,
}: {
  rootInstance: Instance;
  setRootInstance: (instance: Instance) => void;
}) => {
  const [, setSelectedInstance] = useSelectedInstance();
  useSubscribe<"deleteSelectedInstance", { id: Instance["id"] }>(
    "deleteSelectedInstance",
    ({ id }) => {
      const newRootInstance = deleteInstance(rootInstance, id);
      setRootInstance(newRootInstance);
      setSelectedInstance(undefined);
    }
  );
};
