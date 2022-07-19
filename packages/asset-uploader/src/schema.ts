import { UploadHandlerPart } from "@remix-run/node";
import { z } from "zod";
import { NodeOnDiskFile } from "@remix-run/node";
import { DEFAULT_UPLPOAD_PATH } from "./constants";

const SingleImageInUpload = z.instanceof(NodeOnDiskFile);

export const ImagesUpload = z.array(SingleImageInUpload);

export type ImagesUpload = z.infer<typeof ImagesUpload>;
export type SingleImageInUpload = z.infer<typeof SingleImageInUpload>;

export const ImagesUploadedSuccess = z.object({
  Location: z.string(),
});
export type ImagesUploadedSuccess = z.infer<typeof ImagesUploadedSuccess>;

export const s3EnvVariables = z.object({
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_ACL: z.string().optional(),
});

export const fsEnvVariables = z.object({
  FILE_UPLOAD_PATH: z.string().optional().default(DEFAULT_UPLPOAD_PATH),
});

export const assetEnvVariables = z.object({
  MAX_UPLOAD_SIZE: z.number().optional().default(10),
});

export type S3UploadHandler = ({
  file,
  maxPartSize,
}: {
  file: UploadHandlerPart;
  maxPartSize: number;
}) => Promise<File | string | null | undefined>;
