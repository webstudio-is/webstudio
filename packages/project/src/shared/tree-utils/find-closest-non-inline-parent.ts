import { Instance, getComponentMeta } from "@webstudio-is/react-sdk";
import { getInstancePath } from "./get-instance-path";

export const findClosestNonInlineParent = (
  rootInstance: Instance,
  instanceId: Instance["id"]
): Instance | undefined => {
  const path = getInstancePath(rootInstance, instanceId);
  path.reverse();
  return path.find((item) => {
    const meta = getComponentMeta(item.component);
    return meta?.type !== "rich-text-child";
  });
};
