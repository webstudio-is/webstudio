import type { SignatureV4 } from "@smithy/signature-v4";
import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";

const checksumHeader = "x-amz-meta-webstudio-checksum";

export const putImmutableObjectToS3 = async ({
  signer,
  endpoint,
  bucket,
  object,
}: {
  signer: SignatureV4;
  endpoint: string;
  bucket: string;
  object: Parameters<ImmutableAssetResourceIndexStore["putIfAbsent"]>[0];
}): ReturnType<ImmutableAssetResourceIndexStore["putIfAbsent"]> => {
  const data = Uint8Array.from(object.data).buffer;
  const url = new URL(
    `/${bucket}/${extendedEncodeURIComponent(object.key)}`,
    endpoint
  );
  const request = await signer.sign({
    method: "PUT",
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      "x-amz-date": new Date().toISOString(),
      "Content-Type": object.contentType,
      "Content-Length": `${data.byteLength}`,
      "Cache-Control": "private, max-age=31536000, immutable",
      "If-None-Match": "*",
      [checksumHeader]: object.checksum,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    },
    body: data,
  });
  const response = await fetch(url, {
    method: request.method,
    headers: request.headers,
    body: data,
  });
  if (response.ok) {
    return { status: "created", checksum: object.checksum };
  }
  if (response.status !== 412) {
    throw new Error("Cannot persist immutable resource index");
  }

  const headRequest = await signer.sign({
    method: "HEAD",
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      "x-amz-date": new Date().toISOString(),
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    },
  });
  const existing = await fetch(url, {
    method: headRequest.method,
    headers: headRequest.headers,
  });
  if (existing.ok === false) {
    throw new Error("Cannot verify existing immutable resource index");
  }
  const checksum = existing.headers.get(checksumHeader);
  if (checksum === null) {
    throw new Error("Existing immutable resource index has no checksum");
  }
  return { status: "exists", checksum };
};
