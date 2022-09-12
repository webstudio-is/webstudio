import { z } from "zod";
import { DEFAULT_UPLOAD_PATH } from "./constants";

export const S3EnvVariables = z.object({
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_ACL: z.string().optional(),
  ASSET_CDN_URL: z.string().optional(),
});

export const FsEnvVariables = z.object({
  FILE_UPLOAD_PATH: z.string().optional().default(DEFAULT_UPLOAD_PATH),
});
