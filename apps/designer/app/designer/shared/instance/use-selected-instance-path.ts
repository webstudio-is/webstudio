import { Instance } from "@webstudio-is/sdk";
import { useMemo } from "react";
import { useRootInstance } from "apps/designer/app/shared/nano-states";
import { getInstancePath } from "apps/designer/app/shared/tree-utils";

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
