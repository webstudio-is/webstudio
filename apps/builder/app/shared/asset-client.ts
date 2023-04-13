import * as path from "path";
import { MaxSize } from "@webstudio-is/asset-uploader";
import {
  createFsClient,
  createS3Client,
} from "@webstudio-is/asset-uploader/server";
import env from "~/env/env.server";

export const createAssetClient = () => {
  const maxUploadSize = MaxSize.parse(env.MAX_UPLOAD_SIZE);
  if (process.env.NODE_ENV === "development") {
    const fileUploadPath = env.FILE_UPLOAD_PATH ?? "public/s/uploads";
    return createFsClient({
      maxUploadSize,
      fileDirectory: path.join(process.cwd(), fileUploadPath),
    });
  } else {
    return createS3Client({
      endpoint: env.S3_ENDPOINT as string,
      region: env.S3_REGION as string,
      accessKeyId: env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
      bucket: env.S3_BUCKET as string,
      acl: env.S3_ACL,
      maxUploadSize,
    });
  }
};
