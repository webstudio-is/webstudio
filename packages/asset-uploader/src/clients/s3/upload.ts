import { arrayBuffer } from "node:stream/consumers";
import { request as httpRequest, Agent as HttpAgent } from "node:http";
import { request as httpsRequest, Agent as HttpsAgent } from "node:https";
import type { SignatureV4 } from "@smithy/signature-v4";
import { type AssetData, getAssetData } from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";
import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";
import { getMimeTypeByFilename } from "@webstudio-is/sdk";

// Use node:http/https directly instead of fetch to avoid auto-added unsigned headers
// (fetch adds `accept: */*` and others that MinIO rejects as unsigned).
const putToS3 = (
  url: URL,
  headers: Record<string, string>,
  body: ArrayBuffer
): Promise<{ status: number; text: () => Promise<string> }> =>
  new Promise((resolve, reject) => {
    const requestFn = url.protocol === "https:" ? httpsRequest : httpRequest;
    // keepAlive: false prevents node:http from adding "Connection: keep-alive"
    // which would be an unsigned header rejected by MinIO's strict validation.
    const agent =
      url.protocol === "https:"
        ? new HttpsAgent({ keepAlive: false })
        : new HttpAgent({ keepAlive: false });
    let responseBody = "";
    const req = requestFn(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "PUT",
        headers,
        agent,
      },
      (res) => {
        res.on("data", (chunk: Buffer) => {
          responseBody += chunk.toString();
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            text: () => Promise.resolve(responseBody),
          });
        });
      }
    );
    req.on("error", reject);
    req.write(Buffer.from(body));
    req.end();
  });

export const uploadToS3 = async ({
  signer,
  name,
  type,
  data: dataStream,
  maxSize,
  endpoint,
  bucket,
  acl,
  assetInfoFallback,
}: {
  signer: SignatureV4;
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  endpoint: string;
  bucket: string;
  acl?: string;
  assetInfoFallback:
    | { width: number; height: number; format: string }
    | undefined;
}): Promise<AssetData> => {
  const limitSize = createSizeLimiter(maxSize, name);

  // @todo this is going to put the entire file in memory
  // this has to be a stream that goes directly to s3
  // Size check has to happen as you stream and interrupted when size is too big
  // Also check if S3 client has an option to check the size limit
  const data = await arrayBuffer(limitSize(dataStream));

  const url = new URL(
    `/${bucket}/${extendedEncodeURIComponent(name)}`,
    endpoint
  );

  // Use proper MIME type based on file extension instead of generic type category
  const contentType = getMimeTypeByFilename(name);

  // Include host explicitly so it appears in SignedHeaders.
  // node:http always sends Host: hostname:port — if it's not signed, MinIO rejects it.
  const hostHeader = url.port ? `${url.hostname}:${url.port}` : url.hostname;

  const s3Request = await signer.sign({
    method: "PUT",
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      host: hostHeader,
      "Content-Type": contentType,
      "Content-Length": `${data.byteLength}`,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      // encodeURIComponent is needed to support special characters like Cyrillic
      "x-amz-meta-filename": encodeURIComponent(name),
      // when no ACL passed we do not default since some providers do not support it
      ...(acl ? { "x-amz-acl": acl } : {}),
    },
    body: data,
  });

  const response = await putToS3(
    url,
    s3Request.headers as Record<string, string>,
    data
  );

  if (response.status !== 200) {
    const responseText = await response.text().catch(() => "(unreadable)");
    console.error(
      `S3 upload failed: status=${response.status}, url=${url.toString()}, body=${responseText}`
    );
    throw Error(`Cannot upload file ${name}`);
  }

  if (type.startsWith("video") && assetInfoFallback !== undefined) {
    return {
      size: data.byteLength,
      format: assetInfoFallback?.format,
      meta: {
        width: assetInfoFallback?.width ?? 0,
        height: assetInfoFallback?.height ?? 0,
      },
    };
  }

  const assetData = await getAssetData({
    type: type.startsWith("image")
      ? "image"
      : type === "font"
        ? "font"
        : "file",
    size: data.byteLength,
    data: new Uint8Array(data),
    name,
  });

  return assetData;
};
