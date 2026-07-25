import {
  assetQueryRequest,
  type AssetQueryRequestInput,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";

export class AssetQueryRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetQueryRequestError";
  }
}

export class RequestByteLimitError extends Error {}

export const readBoundedRequestBytes = async (
  request: Request,
  maximumBytes: number
) => {
  if (Number.isSafeInteger(maximumBytes) === false || maximumBytes < 0) {
    throw new TypeError("Request byte limit must be a non-negative integer");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestByteLimitError("Request exceeds the byte limit");
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  if (reader !== undefined) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the deterministic limit error if stream cancellation fails.
        }
        throw new RequestByteLimitError("Request exceeds the byte limit");
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

export const readAssetQueryRequest = async (
  request: Request
): Promise<AssetQueryRequestInput> => {
  let bytes: Uint8Array;
  try {
    bytes = await readBoundedRequestBytes(
      request,
      assetResourceLimits.requestBytes
    );
  } catch (error) {
    if (error instanceof RequestByteLimitError) {
      throw new AssetQueryRequestError(
        "Asset query request exceeds the byte limit",
        { cause: error }
      );
    }
    throw error;
  }
  try {
    return assetQueryRequest.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    throw new AssetQueryRequestError("Asset query request is invalid", {
      cause: error,
    });
  }
};
