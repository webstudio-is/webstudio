import { arrayBuffer } from "node:stream/consumers";
import type { SignatureV4 } from "@smithy/signature-v4";
import { type AssetData, getAssetData } from "../../utils/get-asset-data";
import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const uploadToS3 = async ({
  signer,
  name,
  type,
  data: dataStream,

  endpoint,
  bucket,
  acl,
  accessKeyId,
  secretAccessKey,
}: {
  signer: SignatureV4;
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  endpoint: string;
  bucket: string;
  acl?: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<AssetData> => {
  const client = new S3Client({
    endpoint,
    region: "auto",
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  const parallelUploads3 = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: extendedEncodeURIComponent(name),
      Body: dataStream,
    },
  });
  parallelUploads3.on("httpUploadProgress", (progress) => {
    console.log(":::progress:::", progress);
  });

  await parallelUploads3.done();
  return {
    size: 100,
    format: "png",
    meta: { width: 100, height: 100 },
  };

  // @todo this is going to put the entire file in memory
  // this has to be a stream that goes directly to s3
  // Size check has to happen as you stream and interrupted when size is too big
  // Also check if S3 client has an option to check the size limit
  const data = await arrayBuffer(limitSize(dataStream));

  const url = new URL(
    `/${bucket}/${extendedEncodeURIComponent(name)}`,
    endpoint
  );

  const s3Request = await signer.sign({
    method: "PUT",
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      "x-amz-date": new Date().toISOString(),
      "Content-Type": type,
      "Content-Length": `${data.byteLength}`,
      "Cache-Control": "public, max-age=31536004,immutable",
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      // encodeURIComponent is needed to support special characters like Cyrillic
      "x-amz-meta-filename": encodeURIComponent(name),
      // when no ACL passed we do not default since some providers do not support it
      ...(acl ? { "x-amz-acl": acl } : {}),
    },
    body: data,
  });

  const response = await fetch(url, {
    method: s3Request.method,
    headers: s3Request.headers,
    body: data,
  });

  if (response.status !== 200) {
    throw Error(`Cannot upload file ${name}`);
  }

  const assetData = await getAssetData({
    type: type.startsWith("image") ? "image" : "font",
    size: data.byteLength,
    data: new Uint8Array(data),
    name,
  });

  return assetData;
};
