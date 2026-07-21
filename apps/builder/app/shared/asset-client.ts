import * as path from "node:path";
import { maxSize } from "@webstudio-is/asset-uploader";
import {
  createFsClient,
  createS3Client,
  type AssetClientWithReadableResourceIndexStore,
} from "@webstudio-is/asset-uploader/index.server";
import env from "~/env/env.server";

export const fileUploadPath = "public/cgi/asset";

export const getMaxAssetUploadSize = () => maxSize.parse(env.MAX_UPLOAD_SIZE);

export const createAssetClient = () => {
  const maxUploadSize = getMaxAssetUploadSize();
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
      resourceIndexBucket: env.S3_RESOURCE_INDEX_BUCKET,
      acl: env.S3_ACL,
      maxUploadSize,
    });
  } else {
    return createFsClient({
      maxUploadSize,
      fileDirectory: path.join(process.cwd(), fileUploadPath),
      resourceIndexDirectory: path.join(
        process.cwd(),
        "private/asset-resource-indexes"
      ),
    });
  }
};

export const createAssetClientWithResourceIndexStore = () => {
  const client = createAssetClient();
  if (
    client.resourceIndexStore === undefined ||
    client.resourceIndexStore.read === undefined
  ) {
    throw new Error(
      "Private asset resource index storage is not configured. Set S3_RESOURCE_INDEX_BUCKET."
    );
  }
  return client as AssetClientWithReadableResourceIndexStore;
};
