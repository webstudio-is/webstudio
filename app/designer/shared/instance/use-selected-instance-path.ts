import { Instance } from "@webstudio-is/sdk";
import { useMemo } from "react";
import { getInstancePath } from "~/shared/tree-utils";
import { useRootInstance, useSelectedInstanceData } from "../nano-values";

export const useSelectedInstancePath = (): Array<Instance> => {
  const [rootInstance] = useRootInstance();
  const [selectedInstanceData] = useSelectedInstanceData();
  return useMemo(
    () =>
      selectedInstanceData !== undefined && rootInstance !== undefined
        ? getInstancePath(rootInstance, selectedInstanceData.id)
        : [],
    [selectedInstanceData, rootInstance]
  );
};
