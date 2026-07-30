import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  type AssetObjectStore,
  type AssetReadRange,
  validateAssetReadRange,
} from "../../client";

const isPathInside = (root: string, path: string) => {
  const relativePath = relative(root, path);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    relativePath.startsWith(`..${sep}`) === false &&
    isAbsolute(relativePath) === false
  );
};

export const readFromFs = async ({
  name,
  range,
  fileDirectory,
}: {
  name: string;
  range?: AssetReadRange;
  fileDirectory: string;
}): ReturnType<AssetObjectStore["readFile"]> => {
  const root = resolve(fileDirectory);
  const filepath = resolve(root, name);
  if (isPathInside(root, filepath) === false) {
    throw new Error("Asset storage path is outside the configured directory");
  }
  const [resolvedRoot, resolvedFilepath] = await Promise.all([
    realpath(root),
    realpath(filepath),
  ]);
  if (isPathInside(resolvedRoot, resolvedFilepath) === false) {
    throw new Error("Asset storage path is outside the configured directory");
  }
  if (range !== undefined) {
    validateAssetReadRange(range);
  }

  const file = await stat(resolvedFilepath);
  if (range !== undefined && range.offset >= file.size) {
    return {
      data: {
        async *[Symbol.asyncIterator]() {
          // A valid range beyond the end of a local file is empty.
        },
      },
      contentLength: 0,
    };
  }
  const stream = createReadStream(resolvedFilepath, {
    ...(range === undefined
      ? {}
      : {
          start: range.offset,
          end: Math.min(file.size, range.offset + range.length) - 1,
        }),
  });
  return {
    data: stream,
    contentLength:
      range === undefined
        ? file.size
        : Math.max(0, Math.min(range.length, file.size - range.offset)),
  };
};
