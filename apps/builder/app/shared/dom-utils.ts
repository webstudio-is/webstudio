import type { Instance } from "@webstudio-is/project-build";
import { idAttribute } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "./tree-utils";

export const getInstanceElementById = (id: Instance["id"]) => {
  return document.querySelector(`[${idAttribute}="${id}"]`);
};

export const getInstanceIdFromElement = (
  element: Element
): Instance["id"] | undefined => {
  return element.getAttribute(idAttribute) ?? undefined;
};

// traverse dom to the root and find all instances
export const getInstanceSelectorFromElement = (element: Element) => {
  const instanceSelector: InstanceSelector = [];
  let matched: undefined | Element =
    element.closest(`[${idAttribute}]`) ?? undefined;
  while (matched) {
    const instanceId = matched.getAttribute(idAttribute) ?? undefined;
    if (instanceId !== undefined) {
      instanceSelector.push(instanceId);
    }
    matched = matched.parentElement?.closest(`[${idAttribute}]`) ?? undefined;
  }
  if (instanceSelector.length === 0) {
    return;
  }
  return instanceSelector;
};

export const getElementByInstanceSelector = (
  instanceSelector: InstanceSelector | Readonly<InstanceSelector>
) => {
  // query instance from root to target
  const domSelector = instanceSelector
    .map((id) => `[${idAttribute}="${id}"]`)
    .reverse()
    .join(" ");
  return document.querySelector(domSelector) ?? undefined;
};
