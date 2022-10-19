import { z } from "zod";
import { DEFAULT_UPLOAD_PATH, MAX_UPLOAD_SIZE } from "./constants";
import { toBytes } from "./utils/to-bytes";

const maxSize = z
  .string()
  // user inputs the max value in mb and we transform it to bytes
  .transform(toBytes)
  .default(MAX_UPLOAD_SIZE);

export const S3Env = z.object({
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_ACL: z.string().optional(),
  ASSET_CDN_URL: z.string().optional(),
  MAX_UPLOAD_SIZE: maxSize,
});

export const FsEnv = z.object({
  MAX_UPLOAD_SIZE: maxSize,
  FILE_UPLOAD_PATH: z.string().default(DEFAULT_UPLOAD_PATH),
});
