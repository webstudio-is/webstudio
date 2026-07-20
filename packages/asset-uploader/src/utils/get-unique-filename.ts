import { nanoid } from "nanoid";
import { getFileNameParts } from "@webstudio-is/sdk";

export const createUniqueAssetFilename = (filename: string) => {
  const { basename, extension } = getFileNameParts(filename);
  return {
    basename,
    name: `${basename}_${nanoid()}${extension === "" ? "" : `.${extension}`}`,
  };
};
