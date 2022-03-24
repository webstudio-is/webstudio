import { Instance } from "@webstudio-is/sdk";
import { useMemo } from "react";
import { getInstancePath } from "~/shared/tree-utils";
import { useRootInstance } from "../nano-values";

export const useSelectedInstancePath = (
  selectedInstanceId?: Instance["id"]
): Array<Instance> => {
  const [rootInstance] = useRootInstance();
  return useMemo(
    () =>
      selectedInstanceId !== undefined && rootInstance !== undefined
        ? getInstancePath(rootInstance, selectedInstanceId)
        : [],
    [selectedInstanceId, rootInstance]
  );
};
