import type { Instance } from "@webstudio-is/project-build";

export const findClosestSiblingInstance = (
  instance: Instance,
  instanceId: Instance["id"]
): Instance | undefined => {
  if (instance.children.length === 0) {
    return;
  }
  const children = instance.children.filter(
    (child): child is Instance => child.type === "instance"
  );
  const index = children.findIndex((instance) => instance.id === instanceId);
  if (index === -1) {
    return;
  }
  const nextInstance = children[index + 1];
  if (nextInstance !== undefined) {
    return nextInstance;
  }
  const previousInstance = children[index - 1];
  return previousInstance;
};
