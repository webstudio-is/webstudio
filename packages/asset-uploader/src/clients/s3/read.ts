import type { SignatureV4 } from "@smithy/signature-v4";
import {
  type AssetClient,
  type AssetReadRange,
  validateAssetReadRange,
} from "../../client";
import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";

export const readFromS3 = async ({
  signer,
  name,
  range,
  endpoint,
  bucket,
}: {
  signer: SignatureV4;
  name: string;
  range?: AssetReadRange;
  endpoint: string;
  bucket: string;
}): ReturnType<AssetClient["readFile"]> => {
  if (range !== undefined) {
    validateAssetReadRange(range);
  }
  const url = new URL(
    `/${bucket}/${extendedEncodeURIComponent(name)}`,
    endpoint
  );
  const headers = {
    "x-amz-date": new Date().toISOString(),
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    ...(range === undefined
      ? {}
      : { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` }),
  };
  const request = await signer.sign({
    method: "GET",
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers,
  });
  const response = await fetch(url, {
    method: request.method,
    headers: request.headers,
  });
  if (response.ok === false || response.body === null) {
    throw new Error("Cannot read asset file");
  }
  if (range !== undefined && response.status !== 206) {
    throw new Error("Asset storage did not honor the requested range");
  }
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = Number(contentLengthHeader);
  return {
    data: response.body as unknown as AsyncIterable<Uint8Array>,
    ...(contentLengthHeader !== null && Number.isFinite(contentLength)
      ? { contentLength }
      : {}),
  };
};
