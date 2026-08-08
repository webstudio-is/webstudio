import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SignatureV4 } from "@smithy/signature-v4";
import {
  applyAssetDataOverride,
  type AssetData,
  type AssetDataOverride,
  getAssetData,
} from "../../utils/get-asset-data";
import { createSizeLimiter } from "../../utils/size-limiter";
import { spoolToFile } from "../../utils/spool-to-file";
import { getMimeTypeByFilename } from "@webstudio-is/sdk";
import { createS3ObjectUrl } from "./object-url";
import { createS3FetchHeaders, signS3Request } from "./request-headers";
import type { AssetInfoFallback } from "../../client";

const getAssetDataType = (type: string) =>
  type.startsWith("image") ? "image" : type === "font" ? "font" : "file";

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
  assetDataOverride,
}: {
  signer: SignatureV4;
  name: string;
  type: string;
  data: AsyncIterable<Uint8Array>;
  maxSize: number;
  endpoint: string;
  bucket: string;
  acl?: string;
  assetInfoFallback: AssetInfoFallback | undefined;
  assetDataOverride?: AssetDataOverride;
}): Promise<AssetData> => {
  const limitSize = createSizeLimiter(maxSize, name);

  // The incoming stream has an unknown length while S3 requires either a
  // known Content-Length or AWS SigV4 streaming-chunked encoding (which still
  // needs the decoded content length up front). Spool the stream to a temp
  // file first so the size is known and the PUT body can be streamed from
  // disk instead of buffering the whole file in memory. The size check runs
  // while spooling and aborts as soon as the limit is exceeded.
  //
  // The temp file name is a random UUID, decoupled from the object key: the
  // key is user-influenced (slashes, encoding, up to 1024 bytes) and must not
  // be treated as a filesystem path.
  const tempDirectory = await mkdtemp(join(tmpdir(), "webstudio-asset-"));
  const tempPath = join(tempDirectory, randomUUID());

  try {
    const size = await spoolToFile(limitSize(dataStream), tempPath);

    const url = createS3ObjectUrl({
      endpoint,
      bucket,
      key: name,
    });

    // Use proper MIME type based on file extension instead of generic type category
    const contentType = getMimeTypeByFilename(name);

    const assetType = getAssetDataType(type);

    const assetData = applyAssetDataOverride(
      type.startsWith("video") && assetInfoFallback !== undefined
        ? {
            size,
            format: assetInfoFallback.format,
            meta: {
              width: assetInfoFallback.width,
              height: assetInfoFallback.height,
            },
          }
        : await getAssetData({
            type: assetType,
            size,
            data:
              assetType === "image" || assetType === "font"
                ? await readFile(tempPath)
                : new Uint8Array(),
            name,
          }),
      assetDataOverride
    );

    // x-amz-content-sha256: UNSIGNED-PAYLOAD makes @smithy/signature-v4 skip
    // hashing the body (getPayloadHash returns the header value), so no body
    // is passed to the signer. Passing a stream here would leak its file
    // descriptor, because the signer never consumes or destroys it.
    const s3Request = await signS3Request({
      signer,
      url,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": `${size}`,
        "Cache-Control": "public, max-age=31536004,immutable",
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        // encodeURIComponent is needed to support special characters like Cyrillic
        "x-amz-meta-filename": encodeURIComponent(name),
        // when no ACL passed we do not default since some providers do not support it
        ...(acl ? { "x-amz-acl": acl } : {}),
      },
    });

    // Image and font metadata is derived from the full file, so it is read
    // into memory transiently and released before the PUT below. Reading only
    // the header would be unsafe: image-meta rejects truncated buffers for
    // formats whose dimensions live past the leading bytes (e.g. AVIF/TIFF).
    // The S3 transfer itself streams from disk, which bounds memory for the
    // large-file cases (videos, files).
    //
    // duplex: "half" is required by undici when the body is a stream; without
    // it the PUT fails at runtime with "duplex option is required".
    const response = await fetch(url, {
      method: s3Request.method,
      headers: createS3FetchHeaders(s3Request.headers),
      body: createReadStream(tempPath) as unknown as BodyInit,
      duplex: "half",
    } as RequestInit);

    if (response.status !== 200) {
      throw Error(`Cannot upload file ${name}`);
    }

    return assetData;
  } finally {
    try {
      await rm(tempDirectory, { recursive: true, force: true });
    } catch {
      // ignore cleanup failure
    }
  }
};
