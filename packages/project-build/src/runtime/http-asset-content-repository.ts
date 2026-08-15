import {
  AssetContentAuthorizationError,
  AssetRevisionConflictError,
  type AssetContentRepository,
} from "@webstudio-is/asset-uploader/content-repository";
import {
  assetContentDescriptor,
  assetContentDescriptorHeader,
  parseAssetContentDescriptor,
  type AssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { readBoundedBytes } from "@webstudio-is/content-engine/compiler";

const toAsyncIterable = (stream: ReadableStream<Uint8Array>) => ({
  async *[Symbol.asyncIterator]() {
    const reader = stream.getReader();
    let completed = false;
    try {
      for (;;) {
        const result = await reader.read();
        if (result.done) {
          completed = true;
          return;
        }
        yield result.value;
      }
    } finally {
      if (completed === false) {
        await reader.cancel();
      }
      reader.releaseLock();
    }
  },
});

const cancelBody = async (response: Response) => {
  try {
    await response.body?.cancel();
  } catch {
    // Keep the protocol failure that required cancellation.
  }
};

const mapError = (error: unknown): never => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (status === 401 || status === 403) {
    throw new AssetContentAuthorizationError(
      "This Asset is not authorized for content access",
      { cause: error }
    );
  }
  if (status === 409) {
    throw new AssetRevisionConflictError(
      "This file changed since it was opened. Reload it before saving again.",
      { cause: error }
    );
  }
  throw error;
};

export const createHttpAssetContentRepository = ({
  projectId,
  read,
  update,
}: {
  projectId: string;
  read: (input: {
    assetId: string;
    range?: { offset: number; length: number };
  }) => Promise<Response>;
  update: (input: {
    assetId: string;
    expectedName: string;
    data: Uint8Array;
  }) => Promise<AssetContentDescriptor>;
}): AssetContentRepository => ({
  readContent: async ({ assetId, range }) => {
    try {
      const response = await read({ assetId, range });
      const expectedStatus = range === undefined ? 200 : 206;
      if (response.status !== expectedStatus) {
        await cancelBody(response);
        throw Object.assign(
          new Error(
            `Asset content response has unexpected status ${response.status}`
          ),
          { status: response.status }
        );
      }
      let asset: AssetContentDescriptor;
      try {
        asset = parseAssetContentDescriptor(
          response.headers.get(assetContentDescriptorHeader)
        );
      } catch (error) {
        await cancelBody(response);
        throw error;
      }
      if (asset.id !== assetId || asset.projectId !== projectId) {
        await cancelBody(response);
        throw new Error(
          "Asset content response does not match the requested Asset"
        );
      }
      if (
        range === undefined &&
        asset.size > contentEngineLimits.hydratedFileBytes
      ) {
        await cancelBody(response);
        throw new Error("Asset content exceeds the MDX editing limit");
      }
      if (response.body === null) {
        throw new Error("Asset content response has no body");
      }
      const contentLengthHeader = response.headers.get("content-length");
      const contentLength =
        contentLengthHeader === null ? undefined : Number(contentLengthHeader);
      if (
        contentLength !== undefined &&
        (Number.isSafeInteger(contentLength) === false || contentLength < 0)
      ) {
        await cancelBody(response);
        throw new Error("Asset content response has an invalid content length");
      }
      return {
        asset,
        data: toAsyncIterable(response.body),
        contentLength,
      };
    } catch (error) {
      return mapError(error);
    }
  },
  updateContent: async ({ assetId, expectedName, data }) => {
    try {
      const bytes = await readBoundedBytes(
        toAsyncIterable(data),
        contentEngineLimits.hydratedFileBytes
      );
      const descriptor = assetContentDescriptor.parse(
        await update({
          assetId,
          expectedName,
          data: bytes,
        })
      );
      if (descriptor.id !== assetId || descriptor.projectId !== projectId) {
        throw new Error(
          "Asset content update does not match the requested Asset"
        );
      }
      return descriptor;
    } catch (error) {
      return mapError(error);
    }
  },
});
