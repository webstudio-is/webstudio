import { Instance } from "@webstudio-is/react-sdk";
import { useMemo } from "react";
import { useRootInstance } from "~/shared/nano-states";
import { getInstancePath } from "~/shared/tree-utils";

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
