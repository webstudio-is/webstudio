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

export const readAssetQueryRequest = async (
  request: Request
): Promise<AssetQueryRequestInput> => {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > assetResourceLimits.requestBytes
  ) {
    throw new AssetQueryRequestError(
      "Asset query request exceeds the byte limit"
    );
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
      if (byteLength > assetResourceLimits.requestBytes) {
        await reader.cancel();
        throw new AssetQueryRequestError(
          "Asset query request exceeds the byte limit"
        );
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
  try {
    return assetQueryRequest.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    throw new AssetQueryRequestError("Asset query request is invalid", {
      cause: error,
    });
  }
};
