import {
  AssetContentAuthorizationError,
  AssetRevisionConflictError,
  type AssetContentRepository,
} from "@webstudio-is/asset-uploader/content-repository";
import {
  readProjectAssetContent,
  updateProjectAssetContent,
} from "@webstudio-is/http-client";
import {
  assetContentDescriptor,
  assetContentDescriptorHeader,
  parseAssetContentDescriptor,
  type AssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import type { PreparedContentBlockSourceLifecycle } from "@webstudio-is/project-build/runtime";
import { readBoundedBytes } from "@webstudio-is/content-engine/compiler";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { $authToken } from "~/shared/nano-states";

type HttpAssetContentRepositoryDependencies = Readonly<{
  projectId: string;
  origin: string;
  authToken?: () => string | undefined;
  request?: typeof fetch;
}>;

const mapAssetContentError = (error: unknown): never => {
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

const toAsyncIterable = (stream: ReadableStream<Uint8Array>) => ({
  async *[Symbol.asyncIterator]() {
    const reader = stream.getReader();
    let completed = false;
    try {
      while (true) {
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

const cancelResponseBody = async (response: Response) => {
  try {
    await response.body?.cancel();
  } catch {
    // The protocol error that caused cancellation is more useful to callers.
  }
};

export const createHttpAssetContentRepository = ({
  projectId,
  origin,
  authToken = () => undefined,
  request = fetch,
}: HttpAssetContentRepositoryDependencies): AssetContentRepository => ({
  readContent: async ({ assetId, range }) => {
    try {
      const response = await readProjectAssetContent({
        projectId,
        origin,
        requestOrigin: origin,
        authToken: authToken(),
        request,
        assetId,
        range,
      });
      const expectedStatus = range === undefined ? 200 : 206;
      if (response.status !== expectedStatus) {
        await cancelResponseBody(response);
        throw new Error(
          `Asset content response has unexpected status ${response.status}`
        );
      }
      let asset: AssetContentDescriptor;
      try {
        asset = parseAssetContentDescriptor(
          response.headers.get(assetContentDescriptorHeader)
        );
      } catch (error) {
        await cancelResponseBody(response);
        throw error;
      }
      if (asset.id !== assetId || asset.projectId !== projectId) {
        await cancelResponseBody(response);
        throw new Error(
          "Asset content response does not match the requested Asset"
        );
      }
      if (
        range === undefined &&
        asset.size > contentEngineLimits.hydratedFileBytes
      ) {
        await cancelResponseBody(response);
        throw new Error("Asset content exceeds the MDX editing limit");
      }
      const body = response.body;
      if (body === null) {
        throw new Error("Asset content response has no body");
      }
      const contentLengthHeader = response.headers.get("content-length");
      const contentLength =
        contentLengthHeader === null ? undefined : Number(contentLengthHeader);
      if (
        contentLength !== undefined &&
        (Number.isSafeInteger(contentLength) === false || contentLength < 0)
      ) {
        await cancelResponseBody(response);
        throw new Error("Asset content response has an invalid content length");
      }
      return {
        asset,
        data: toAsyncIterable(body),
        contentLength,
      };
    } catch (error) {
      return mapAssetContentError(error);
    }
  },
  updateContent: async ({ assetId, expectedName, data }) => {
    try {
      const bytes = await readBoundedBytes(
        toAsyncIterable(data),
        contentEngineLimits.hydratedFileBytes
      );
      const { asset } = await updateProjectAssetContent({
        projectId,
        origin,
        requestOrigin: origin,
        authToken: authToken(),
        request,
        assetId,
        expectedName,
        readAssetData: async () => bytes,
      });
      const descriptor = assetContentDescriptor.parse(asset);
      if (descriptor.id !== assetId || descriptor.projectId !== projectId) {
        throw new Error(
          "Asset content update does not match the requested Asset"
        );
      }
      return descriptor;
    } catch (error) {
      return mapAssetContentError(error);
    }
  },
});

export const createBuilderMdxAssetContentRepository = ({
  projectId,
  origin = window.location.origin,
}: {
  projectId: string;
  origin?: string;
}) =>
  createHttpAssetContentRepository({
    projectId,
    origin,
    authToken: () => $authToken.get(),
    request: builderFetch,
  });

export type MdxContentPersistencePlan =
  | Readonly<{ status: "ready"; mode: "project" | "single-asset" | "noop" }>
  | Readonly<{
      status: "blocked";
      reason:
        | "atomic-project-and-asset-unavailable"
        | "atomic-multiple-assets-unavailable";
    }>;

export const getMdxContentPersistencePlan = (
  prepared: PreparedContentBlockSourceLifecycle
): MdxContentPersistencePlan => {
  if (prepared.storageWrites.length > 1) {
    return {
      status: "blocked",
      reason: "atomic-multiple-assets-unavailable",
    };
  }
  if (
    prepared.storageWrites.length === 1 &&
    prepared.projectPayload.length > 0
  ) {
    return {
      status: "blocked",
      reason: "atomic-project-and-asset-unavailable",
    };
  }
  if (prepared.storageWrites.length === 1) {
    return { status: "ready", mode: "single-asset" };
  }
  if (prepared.projectPayload.length > 0) {
    return { status: "ready", mode: "project" };
  }
  return { status: "ready", mode: "noop" };
};
