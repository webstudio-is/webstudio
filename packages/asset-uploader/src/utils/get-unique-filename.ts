import { nanoid } from "nanoid";
import { getFileExtension } from "@webstudio-is/sdk";

export const createUniqueAssetFilename = (filename: string) => {
  const extensionName = getFileExtension(filename);
  const extension =
    extensionName === undefined
      ? ""
      : filename.slice(-extensionName.length - 1);
  const basename = filename.slice(0, filename.length - extension.length);
  return {
    basename,
    name: `${basename}_${nanoid()}${extension}`,
  };
};
