import { type Instance } from "@webstudio-is/react-sdk";
import { findInstanceById } from "~/shared/tree-utils";

export const getInstanceElementById = (id: Instance["id"]) => {
  return document.getElementById(id);
};

export const getInstanceIdFromElement = (
  element: Element
): Instance["id"] | undefined => {
  return element.id === "" ? undefined : element.id;
};

export const findInstanceByElement = (
  rootInstance: Instance,
  element: Element
): Instance | undefined => {
  const id = getInstanceIdFromElement(element);

  if (id === undefined) {
    return undefined;
  }

  return findInstanceById(rootInstance, id);
};
