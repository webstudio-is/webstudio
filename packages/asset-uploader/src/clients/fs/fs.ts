import type { AssetClient } from "../../client";
import { uploadToFs } from "./upload";
import { readFromFs } from "./read";

type FsClientOptions = {
  fileDirectory: string;
  maxUploadSize: number;
};

export const createFsClient = (options: FsClientOptions): AssetClient => {
  return {
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
