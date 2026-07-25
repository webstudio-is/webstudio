import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@smithy/signature-v4";
import type { AssetClient } from "../../client";
import { uploadToS3 } from "./upload";
import { readFromS3 } from "./read";

type S3StorageOptions = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export type S3ClientOptions = S3StorageOptions & {
  acl?: string;
  maxUploadSize: number;
};

const createS3Signer = (options: S3StorageOptions) =>
  new SignatureV4({
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    region: options.region,
    service: "s3",
    sha256: Sha256,
    // Paths are encoded centrally by createS3ObjectUrl.
    uriEscapePath: false,
  });

export const createS3Client = (options: S3ClientOptions): AssetClient => {
  const signer = createS3Signer(options);
  const uploadFile: AssetClient["uploadFile"] = async (
    name,
    type,
    data,
    assetInfoFallback,
    assetDataOverride
  ) => {
    return uploadToS3({
      signer,
      name,
      type,
      data,
      maxSize: options.maxUploadSize,
      endpoint: options.endpoint,
      bucket: options.bucket,
      acl: options.acl,
      assetInfoFallback,
      assetDataOverride,
    });
  };

  return {
    uploadFile,
    readFile: (name, range) =>
      readFromS3({
        signer,
        name,
        range,
        endpoint: options.endpoint,
        bucket: options.bucket,
      }),
  };
};

export const createS3AssetObjectStore = createS3Client;
