import { arrayBuffer } from "node:stream/consumers";
import type { SignatureV4 } from "@smithy/signature-v4";
import { type AssetData, getAssetData } from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";
import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";
import { getMimeTypeByFilename } from "@webstudio-is/sdk";

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

  const s3Request = await signer.sign({
    method: "PUT",
    protocol: url.protocol,
    hostname: url.hostname,
    // Pass port separately so the signer constructs `host: hostname:port` for
    // non-standard ports, matching what fetch automatically sends from the URL.
    // Without this, the signed host is `hostname` but fetch sends `hostname:port`,
    // causing MinIO's strict SigV4 validation to reject the request.
    port: url.port ? parseInt(url.port) : undefined,
    path: url.pathname,
    headers: {
      // MinIO strictly rejects requests where any header is not listed in
      // SignedHeaders. fetch (undici in Node.js) auto-adds several headers that
      // would otherwise be unsigned. Pre-signing them here prevents rejection.
      // Values are set explicitly so undici uses ours instead of its defaults:
      //   accept          — added if absent (Fetch spec step 12)
      //   accept-language — added if absent (Fetch spec step 13)
      //   accept-encoding — added if absent; "identity" disables compression
      //   user-agent      — added if absent; we override the default "undici"/"node"
      //   sec-fetch-mode  — always overwritten by undici to the fetch mode ("cors")
      // In CF Workers, fetch does not add these headers the same way, so this
      // list is sufficient for both environments.
      accept: "*/*",
      "accept-language": "*",
      "accept-encoding": "identity",
      "user-agent": "webstudio",
      "sec-fetch-mode": "cors",
      // undici appends origin for non-GET/HEAD requests in cors mode (Fetch spec step 12.3)
      // In Node.js the client origin is opaque ("null")
      origin: "null",
      "Content-Type": contentType,
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

  // Temporary debug: log signed headers to identify any remaining unsigned ones
  console.info(
    `S3 upload headers: ${JSON.stringify(Object.keys(s3Request.headers).sort())}`
  );

  const response = await fetch(url, {
    method: s3Request.method,
    headers: s3Request.headers,
    body: data,
  });

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
