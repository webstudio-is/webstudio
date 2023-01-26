import type { Instance } from "@webstudio-is/project-build";
import { useMemo } from "react";
import { useRootInstance } from "~/shared/nano-states";
import { utils } from "@webstudio-is/project";

export const useSelectedInstancePath = (
  selectedInstanceId?: Instance["id"]
): Array<Instance> => {
  const [rootInstance] = useRootInstance();
  return useMemo(
    () =>
      selectedInstanceId !== undefined && rootInstance !== undefined
        ? utils.tree.getInstancePath(rootInstance, selectedInstanceId)
        : [],
    [selectedInstanceId, rootInstance]
  );
};
