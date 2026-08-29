import {
  getContentModeEditableInstanceIds,
  getContentModeFrontmatterBoundTargets,
} from "@webstudio-is/project-build/runtime";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import type { Instances, Props } from "@webstudio-is/sdk";

export const isTextEditableInContentMode = ({
  isContentMode,
  instanceSelector,
  instances,
  props,
}: {
  isContentMode: boolean;
  instanceSelector: InstanceSelector;
  instances: Instances;
  props: Props;
}) => {
  if (isContentMode === false) {
    return true;
  }
  const instanceId = instanceSelector[0];
  return (
    getContentModeEditableInstanceIds({ instances }).has(instanceId) ||
    getContentModeFrontmatterBoundTargets({
      instances,
      props,
    }).textInstanceIds.has(instanceId)
  );
};
