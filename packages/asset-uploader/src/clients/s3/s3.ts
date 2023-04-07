import type { AssetClient } from "../../client";
import { deleteFromS3 } from "./delete";
import { uploadToS3 } from "./upload";

type S3ClientOptions = {
  maxUploadSize: number;
};

export const createS3Client = (clientOptions: S3ClientOptions): AssetClient => {
  const { maxUploadSize } = clientOptions;
  return {
    uploadFile: (request) => uploadToS3({ request, maxSize: maxUploadSize }),
    deleteFile: deleteFromS3,
  };
};
