import type { Instance, Instances, Pages } from "@webstudio-is/sdk";
import {
  findPageAndSelectorByInstanceId,
  getInstancePath,
} from "@webstudio-is/project-build/runtime";
import { getInstanceLabel } from "~/builder/shared/instance-label";

/**
 * Build the ancestor path array for an instance.
 * Returns an array of labels for all ancestors from root to parent.
 */
export const buildInstancePath = (
  instanceId: Instance["id"],
  pages: Pages,
  instances: Instances
): string[] => {
  const awareness = findPageAndSelectorByInstanceId(
    pages,
    instances,
    instanceId
  );
  if (!awareness.instanceSelector) {
    return [];
  }

  const instancePath = getInstancePath(awareness.instanceSelector, instances);

  if (!instancePath) {
    return [];
  }

  return instancePath
    .slice()
    .reverse()
    .slice(0, -1)
    .map(({ instance }) => getInstanceLabel(instance));
};
