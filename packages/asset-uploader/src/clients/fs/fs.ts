import type { AssetClient } from "../../client";
import { deleteFromFs } from "./delete";
import { uploadToFs } from "./upload";

type FsClientOptions = {
  fileDirectory: string;
  maxUploadSize: number;
};

export const createFsClient = (options: FsClientOptions): AssetClient => {
  return {
    uploadFile: (name, type, request) =>
      uploadToFs({
        name,
        type,
        request,
        maxSize: options.maxUploadSize,
        fileDirectory: options.fileDirectory,
      }),
    deleteFile: (name) =>
      deleteFromFs({ name, fileDirectory: options.fileDirectory }),
  };
};
