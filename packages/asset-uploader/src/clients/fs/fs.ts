import type { AssetClientWithResourceIndexStore } from "../../client";
import { uploadToFs } from "./upload";
import { readFromFs } from "./read";
import { createFsImmutableResourceIndexStore } from "./immutable-object";

type FsClientOptions = {
  fileDirectory: string;
  maxUploadSize: number;
};

export const createFsClient = (
  options: FsClientOptions
): AssetClientWithResourceIndexStore => {
  return {
    resourceIndexStore: createFsImmutableResourceIndexStore(
      options.fileDirectory
    ),
    uploadFile: (name, type, data, _assetInfoFallback, assetDataOverride) =>
      uploadToFs({
        name,
        type,
        data,
        maxSize: options.maxUploadSize,
        fileDirectory: options.fileDirectory,
        assetDataOverride,
      }),
    readFile: (name, range) =>
      readFromFs({ name, range, fileDirectory: options.fileDirectory }),
  };
};
