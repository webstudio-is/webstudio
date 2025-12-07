import type { Instance, Instances } from "@webstudio-is/sdk";
import type { InstanceSelector } from "~/shared/tree-utils";

/**
 * Very loose selector finder
 * Will not work properly with collections
 */
export const findInstanceById = (
  instances: Instances,
  instanceSelector: InstanceSelector,
  targetId: Instance["id"]
): undefined | InstanceSelector => {
  const [instanceId] = instanceSelector;
  if (instanceId === targetId) {
    return instanceSelector;
  }
  const instance = instances.get(instanceId);
  if (instance) {
    for (const child of instance.children) {
      if (child.type === "id") {
        const matched = findInstanceById(
          instances,
          [child.value, ...instanceSelector],
          targetId
        );
        if (matched) {
          return matched;
        }
      }
    }
  }
};
