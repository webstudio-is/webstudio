import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@smithy/signature-v4";
import type { AssetClient } from "../../client";
import {
  getHostedProjectStoragePrefixes,
  ObjectProjectStore,
} from "@webstudio-is/project-store";
import { uploadToS3 } from "./upload";
import { readFromS3 } from "./read";
import { S3ProjectObjectStore } from "./project-object-store";

export type S3StorageOptions = {
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

export const createS3ProjectStore = (
  options: S3StorageOptions,
  projectId: string
) => {
  const signer = createS3Signer(options);
  const prefixes = getHostedProjectStoragePrefixes(projectId);
  const objects = new S3ProjectObjectStore({
    signer,
    endpoint: options.endpoint,
    bucket: options.bucket,
    prefix: prefixes.database,
  });
  const assets = new S3ProjectObjectStore({
    signer,
    endpoint: options.endpoint,
    bucket: options.bucket,
    prefix: prefixes.assets,
  });
  return new ObjectProjectStore({ projectId, objects, assets, heads: objects });
};

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
