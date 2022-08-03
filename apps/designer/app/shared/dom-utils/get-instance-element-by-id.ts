import { type Instance } from "@webstudio-is/react-sdk";

export const getInstanceElementById = (id: Instance["id"]) => {
  return document.getElementById(id);
};
