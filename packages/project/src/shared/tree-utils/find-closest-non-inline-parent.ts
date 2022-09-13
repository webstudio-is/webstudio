import { Instance, components } from "@webstudio-is/react-sdk";
import { getInstancePath } from "./get-instance-path";

export const findClosestNonInlineParent = (
  rootInstance: Instance,
  instanceId: Instance["id"]
): Instance | undefined => {
  const path = getInstancePath(rootInstance, instanceId);
  path.reverse();
  return path.find((item) => components[item.component].isInlineOnly === false);
};
