import type { AssetClient } from "../../client";
import { deleteFromFs } from "./delete";
import { uploadToFs } from "./upload";

type FSClientOptions = {
  fileDirectory: string;
  maxUploadSize: number;
};

export const createFSClient = (options: FSClientOptions): AssetClient => {
  return {
    uploadFile: (request) =>
      uploadToFs({
        request,
        maxSize: options.maxUploadSize,
        fileDirectory: options.fileDirectory,
      }),
    deleteFile: (name) =>
      deleteFromFs({ name, fileDirectory: options.fileDirectory }),
  };
};
