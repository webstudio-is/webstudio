import { S3Env, FsEnv } from "@webstudio-is/asset-uploader";
import {
  createFSClient,
  createS3Client,
} from "@webstudio-is/asset-uploader/server";

export const createAssetClient = () => {
  if (process.env.NODE_ENV === "development") {
    const env = FsEnv.parse(process.env);
    return createFSClient({
      maxUploadSize: env.MAX_UPLOAD_SIZE,
    });
  } else {
    const env = S3Env.parse(process.env);
    return createS3Client({
      maxUploadSize: env.MAX_UPLOAD_SIZE,
    });
  }
};
