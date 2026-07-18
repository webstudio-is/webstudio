import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import {
  type AssetClient,
  type AssetReadRange,
  validateAssetReadRange,
} from "../../client";

export const readFromFs = async ({
  name,
  range,
  fileDirectory,
}: {
  name: string;
  range?: AssetReadRange;
  fileDirectory: string;
}): ReturnType<AssetClient["readFile"]> => {
  const root = resolve(fileDirectory);
  const filepath = resolve(root, name);
  if (filepath.startsWith(`${root}${sep}`) === false) {
    throw new Error("Asset storage path is outside the configured directory");
  }
  if (range !== undefined) {
    validateAssetReadRange(range);
  }

  const file = await stat(filepath);
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
  const stream = createReadStream(filepath, {
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
