import type { SignatureV4 } from "@smithy/signature-v4";
import {
  type AssetClient,
  type AssetReadRange,
  validateAssetReadRange,
} from "../../client";
import { createS3ObjectUrl } from "./object-url";
import { createS3FetchHeaders, signS3Request } from "./request-headers";

export const readFromS3 = async ({
  signer,
  name,
  range,
  endpoint,
  bucket,
  keyType = "flat",
}: {
  signer: SignatureV4;
  name: string;
  range?: AssetReadRange;
  endpoint: string;
  bucket: string;
  keyType?: "flat" | "hierarchical";
}): ReturnType<AssetClient["readFile"]> => {
  if (range !== undefined) {
    validateAssetReadRange(range);
  }
  const url = createS3ObjectUrl({ endpoint, bucket, key: name, keyType });
  const headers = {
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    ...(range === undefined
      ? {}
      : { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` }),
  };
  const request = await signS3Request({
    signer,
    url,
    method: "GET",
    headers,
  });
  const response = await fetch(url, {
    method: request.method,
    headers: createS3FetchHeaders(request.headers),
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
