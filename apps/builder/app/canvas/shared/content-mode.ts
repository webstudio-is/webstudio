import { getContentModeEditableInstanceIds } from "@webstudio-is/project-build/runtime";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import type { Instances } from "@webstudio-is/sdk";
import { getMaterializedInstanceEditability } from "~/shared/content-block-content";

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
  const materializedEditability = getMaterializedInstanceEditability({
    instanceSelector,
    instances,
  });
  if (materializedEditability !== undefined) {
    return materializedEditability;
  }
  return getContentModeEditableInstanceIds({ instances }).has(
    instanceSelector[0]
  );
};
