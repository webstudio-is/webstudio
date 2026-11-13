import type { AssetObjectStore } from "../../client";
import { uploadToFs } from "./upload";
import { readFromFs } from "./read";

type FsClientOptions = {
  fileDirectory: string;
  maxUploadSize: number;
};

export const createFsAssetObjectStore = (
  options: FsClientOptions
): AssetObjectStore => {
  return {
    uploadFile: (name, type, data, assetInfoFallback, assetDataOverride) =>
      uploadToFs({
        name,
        type,
        data,
        maxSize: options.maxUploadSize,
        fileDirectory: options.fileDirectory,
        assetInfoFallback,
        assetDataOverride,
      }),
    readFile: (name, range) =>
      readFromFs({ name, range, fileDirectory: options.fileDirectory }),
  };
};
