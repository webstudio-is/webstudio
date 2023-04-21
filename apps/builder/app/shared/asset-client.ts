import * as path from "node:path";
import { MaxSize } from "@webstudio-is/asset-uploader";
import {
  createFsClient,
  createS3Client,
} from "@webstudio-is/asset-uploader/index.server";
import env from "~/env/env.server";

export const createAssetClient = () => {
  const maxUploadSize = MaxSize.parse(env.MAX_UPLOAD_SIZE);
  if (
    env.S3_ENDPOINT !== undefined &&
    env.S3_REGION !== undefined &&
    env.S3_ACCESS_KEY_ID !== undefined &&
    env.S3_SECRET_ACCESS_KEY !== undefined &&
    env.S3_BUCKET !== undefined
  ) {
    return createS3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
      acl: env.S3_ACL,
      maxUploadSize,
    });
  } else {
    const fileUploadPath = env.FILE_UPLOAD_PATH ?? "public/s/uploads";
    return createFsClient({
      maxUploadSize,
      fileDirectory: path.join(process.cwd(), fileUploadPath),
    });
  }
};
