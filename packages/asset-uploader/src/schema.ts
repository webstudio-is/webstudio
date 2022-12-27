import { z } from "zod";
import { FontFormat, FontMeta } from "@webstudio-is/fonts";
import { DEFAULT_UPLOAD_PATH, MAX_UPLOAD_SIZE } from "./constants";
import { toBytes } from "./utils/to-bytes";

export const ImageMeta = z.object({
  width: z.number(),
  height: z.number(),
});
export type ImageMeta = z.infer<typeof ImageMeta>;

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

const Location = z.union([z.literal("FS"), z.literal("REMOTE")]);

const BaseAsset = z.object({
  id: z.string(),
  projectId: z.string(),
  format: z.string(),
  size: z.number(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  location: Location,
  createdAt: z.string(),
  path: z.string(),
});

export const FontAsset = BaseAsset.omit({ format: true }).extend({
  format: FontFormat,
  meta: FontMeta,
  type: z.literal("font"),
});
export type FontAsset = z.infer<typeof FontAsset>;

export const ImageAsset = BaseAsset.extend({
  meta: ImageMeta,
  type: z.literal("image"),
});
export type ImageAsset = z.infer<typeof ImageAsset>;

export const Asset = z.union([FontAsset, ImageAsset]);
export type Asset = z.infer<typeof Asset>;

export const idsFormDataFieldName = "ids";
