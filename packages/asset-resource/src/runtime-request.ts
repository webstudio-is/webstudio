import type { AssetResourceQueryRequest } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  normalizeJsonValue,
  serializeJsonDeterministically,
} from "@webstudio-is/project-store/json";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const variableName = /^[_A-Za-z][_0-9A-Za-z]*$/;

export const parsePublishedAssetQueryRequest = (
  value: unknown
): AssetResourceQueryRequest => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Asset resource request must be an object");
  }
  const request = value as Record<string, unknown>;
  if (
    typeof request.query !== "string" ||
    request.query.length === 0 ||
    encoder.encode(request.query).byteLength > assetResourceLimits.queryBytes
  ) {
    throw new Error("Asset resource query is invalid");
  }
  const normalizedVariables = normalizeJsonValue(request.variables ?? {});
  if (
    typeof normalizedVariables !== "object" ||
    normalizedVariables === null ||
    Array.isArray(normalizedVariables)
  ) {
    throw new Error("Asset resource variables must be an object");
  }
  const names = Object.keys(normalizedVariables);
  if (
    names.length > assetResourceLimits.variableCount ||
    names.some((name) => variableName.test(name) === false) ||
    encoder.encode(serializeJsonDeterministically(normalizedVariables))
      .byteLength > assetResourceLimits.variableBytes
  ) {
    throw new Error("Asset resource variables are invalid");
  }
  if (
    request.operationName !== undefined &&
    (typeof request.operationName !== "string" ||
      request.operationName.length === 0 ||
      request.operationName.length > 255 ||
      variableName.test(request.operationName) === false)
  ) {
    throw new Error("Asset resource operation name is invalid");
  }
  if (
    request.indexRevision !== undefined &&
    (typeof request.indexRevision !== "string" ||
      request.indexRevision.length === 0 ||
      request.indexRevision.length > 255)
  ) {
    throw new Error("Asset resource index revision is invalid");
  }
  return {
    query: request.query,
    variables: normalizedVariables as AssetResourceQueryRequest["variables"],
    ...(request.operationName === undefined
      ? {}
      : { operationName: request.operationName as string }),
    ...(request.indexRevision === undefined
      ? {}
      : { indexRevision: request.indexRevision as string }),
  };
};

const readBoundedRequestBody = async (request: Request) => {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (
      Number.isSafeInteger(length) === false ||
      length < 0 ||
      length > assetResourceLimits.requestBytes
    ) {
      throw new Error("Asset resource request body is invalid");
    }
  }
  if (request.body === null) {
    throw new Error("Asset resource request body is missing");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      length += value.byteLength;
      if (length > assetResourceLimits.requestBytes) {
        await reader.cancel();
        throw new Error("Asset resource request body exceeds the byte limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(bytes);
};

export const parsePublishedAssetQueryRequestBody = async (request: Request) => {
  const body = await readBoundedRequestBody(request);
  return {
    body,
    request: parsePublishedAssetQueryRequest(JSON.parse(body)),
  };
};
