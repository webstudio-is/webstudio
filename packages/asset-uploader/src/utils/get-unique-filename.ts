import * as path from "node:path";
import { nanoid } from "nanoid";

export const getUniqueFilename = (filename: string): string => {
  const id = nanoid();
  const extension = path.extname(filename);
  const name = path.basename(filename, extension);
  return `${name}_${id}${extension}`;
};
