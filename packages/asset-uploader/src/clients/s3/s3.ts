import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { AssetClient } from "../../client";
import { uploadToS3 } from "./upload";

type S3ClientOptions = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  acl?: string;
  maxUploadSize: number;
};

export const createS3Client = (options: S3ClientOptions): AssetClient => {
  // @todo find a way to destroy this client to free resources
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  const uploadFile: AssetClient["uploadFile"] = async (name, type, data) => {
    return uploadToS3({
      client,
      name,
      type,
      data,
      maxSize: options.maxUploadSize,
      bucket: options.bucket,
      acl: options.acl,
    });
  };

  const deleteFile: AssetClient["deleteFile"] = async (name) => {
    await client.send(
      new DeleteObjectCommand({
        Bucket: options.bucket,
        Key: name,
      })
    );
  };

  return {
    uploadFile,
    deleteFile,
  };
};
