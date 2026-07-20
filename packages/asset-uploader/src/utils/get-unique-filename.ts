import * as path from "node:path";
import { nanoid } from "nanoid";
import { assetStorageIdLength } from "@webstudio-is/sdk";

export const getUniqueFilename = (filename: string): string => {
  const id = nanoid(assetStorageIdLength);
  const extension = path.extname(filename);
  const name = path.basename(filename, extension);
  return `${name}_${id}${extension}`;
};
