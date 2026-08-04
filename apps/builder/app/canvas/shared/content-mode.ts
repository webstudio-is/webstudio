import { getContentModeEditableInstanceIds } from "@webstudio-is/project-build/runtime";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import type { Instances } from "@webstudio-is/sdk";

export const isTextEditableInContentMode = ({
  isContentMode,
  instanceSelector,
  instances,
}: {
  isContentMode: boolean;
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  if (isContentMode === false) {
    return true;
  }
  if (
    instances
      .get(instanceSelector[0])
      ?.children.some((child) => child.type === "expression")
  ) {
    return false;
  }
  return getContentModeEditableInstanceIds({ instances }).has(
    instanceSelector[0]
  );
};
