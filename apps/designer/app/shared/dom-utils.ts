import type { Instance } from "@webstudio-is/project-build";
import { idAttribute } from "@webstudio-is/react-sdk";

export const getInstanceElementById = (id: Instance["id"]) => {
  return document.querySelector(`[${idAttribute}="${id}"]`);
};

export const getInstanceIdFromElement = (
  element: Element
): Instance["id"] | undefined => {
  return element.getAttribute(idAttribute) ?? undefined;
};
