import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@smithy/signature-v4";
import type {
  AssetClient,
  AssetClientWithResourceIndexStore,
} from "../../client";
import { uploadToS3 } from "./upload";
import { readFromS3 } from "./read";
import { putImmutableObjectToS3 } from "./immutable-object";

type S3ClientOptions = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  acl?: string;
  maxUploadSize: number;
};

export const createS3Client = (
  options: S3ClientOptions
): AssetClientWithResourceIndexStore => {
  const signer = new SignatureV4({
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    region: options.region,
    service: "s3",
    sha256: Sha256,
    // should never be enabled when work with s3
    uriEscapePath: false,
  });

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
    resourceIndexStore: {
      putIfAbsent: (object) =>
        putImmutableObjectToS3({
          signer,
          endpoint: options.endpoint,
          bucket: options.bucket,
          object,
        }),
    },
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
