import { createId, getFileNameParts } from "@webstudio-is/sdk";

export const createUniqueAssetFilename = (filename: string) => {
  const { basename, extension } = getFileNameParts(filename);
  return `${basename}_${createId("nano")}${extension === "" ? "" : `.${extension}`}`;
};
