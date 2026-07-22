import type { SignatureV4 } from "@smithy/signature-v4";
import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import { createS3ObjectUrl } from "./object-url";

const checksumHeader = "x-amz-meta-webstudio-checksum";
const maxConditionalWriteAttempts = 3;

const verifyExistingObject = async ({
  signer,
  url,
}: {
  signer: SignatureV4;
  url: URL;
}) => {
  const request = await signer.sign({
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
    method: request.method,
    headers: request.headers,
  });
  if (existing.ok === false) {
    throw new Error("Cannot verify existing immutable resource index");
  }
  const checksum = existing.headers.get(checksumHeader);
  if (checksum === null) {
    throw new Error("Existing immutable resource index has no checksum");
  }
  return { status: "exists", checksum } as const;
};

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
  const url = createS3ObjectUrl({
    endpoint,
    bucket,
    key: object.key,
    keyType: "hierarchical",
  });
  for (let attempt = 1; attempt <= maxConditionalWriteAttempts; attempt += 1) {
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
    if (response.status === 412) {
      return verifyExistingObject({ signer, url });
    }
    if (response.status !== 409 || attempt === maxConditionalWriteAttempts) {
      throw new Error(
        `Cannot persist immutable resource index (${response.status})`
      );
    }
  }
  throw new Error("Cannot persist immutable resource index");
};

export const deleteImmutableObjectFromS3 = async ({
  signer,
  endpoint,
  bucket,
  key,
}: {
  signer: SignatureV4;
  endpoint: string;
  bucket: string;
  key: string;
}) => {
  const url = createS3ObjectUrl({
    endpoint,
    bucket,
    key,
    keyType: "hierarchical",
  });
  const request = await signer.sign({
    method: "DELETE",
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      "x-amz-date": new Date().toISOString(),
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    },
  });
  const response = await fetch(url, {
    method: request.method,
    headers: request.headers,
  });
  if (response.status === 404) {
    return "missing" as const;
  }
  if (response.ok === false) {
    throw new Error(
      `Cannot delete immutable resource index (${response.status})`
    );
  }
  return "deleted" as const;
};
