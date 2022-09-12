import path from "path";
import ObjectID from "bson-objectid";

export const getUniqueFilename = (filename?: string): string => {
  const id = ObjectID().toString();
  if (filename === undefined) {
    // @todo we need to actually detect the extesion || ".jpeg"
    return `${id}.jpeg`;
  }
  const extension = path.extname(filename);
  const name = path.basename(filename, extension);
  return `${name}_${id}${extension}`;
};
