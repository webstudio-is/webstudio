import type { AssetClient } from "../../client";
import { deleteFromFs } from "./delete";
import { uploadToFs } from "./upload";

type FSClientOptions = {
  maxUploadSize: number;
};

export const createFSClient = (clientOptions: FSClientOptions): AssetClient => {
  const { maxUploadSize } = clientOptions;
  return {
    uploadFile: (request) => uploadToFs({ request, maxSize: maxUploadSize }),
    deleteFile: deleteFromFs,
  };
};
