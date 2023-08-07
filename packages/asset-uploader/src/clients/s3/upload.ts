import { arrayBuffer } from "node:stream/consumers";
import type { SignatureV4 } from "@smithy/signature-v4";
import { getAssetData } from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";

export const uploadToS3 = async ({
  signer,
  name,
  type,
  data: dataStream,
  maxSize,
  endpoint,
  bucket,
  acl,
}: {
  signer: SignatureV4;
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  endpoint: string;
  bucket: string;
  acl?: string;
}) => {
  const limitSize = createSizeLimiter(maxSize, name);

  // @todo this is going to put the entire file in memory
  // this has to be a stream that goes directly to s3
  // Size check has to happen as you stream and interrupted when size is too big
  // Also check if S3 client has an option to check the size limit
  const data = await arrayBuffer(limitSize(dataStream));

  const url = new URL(`/${bucket}/${name}`, endpoint);

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
  });

  return assetData;
};
