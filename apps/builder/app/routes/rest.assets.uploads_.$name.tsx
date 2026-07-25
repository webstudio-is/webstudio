import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { arrayBuffer } from "node:stream/consumers";
import {
  createSizeLimiter,
  assetDataOverride,
  getContentHash,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/index.server";
import { isAssetFileName } from "@webstudio-is/protocol";
import { assetResourceApiOperations } from "@webstudio-is/sdk/asset-resource-api";
import type { Asset } from "@webstudio-is/sdk";
import type { AssetActionResponse } from "~/builder/shared/assets";
import {
  createAssetClient,
  getMaxAssetUploadSize,
} from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { requiresAssetMutationCsrf } from "~/services/asset-rest-auth.server";
import {
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
} from "~/services/asset-rest.server";
import { assertApiProjectPermit } from "~/services/api-permits.server";
import {
  getAssetInfoFallback,
  getBrowserAssetFormat,
  parseAssetType,
  type AssetInfoFallback,
} from "@webstudio-is/project-build/runtime";
import { getBrowserUploadBody } from "~/services/asset-upload.server";

// The explicit uploads segment prevents asset names such as `query` from
// shadowing the read-only Assets API.

const createAssetUploadResponse = async ({
  body,
  name,
  assetInfoFallback,
  assetInfoOverride,
  assetId,
  repository,
}: {
  body: ReadableStream<Uint8Array>;
  name: string;
  assetInfoFallback: AssetInfoFallback;
  assetInfoOverride?: {
    format?: string;
    meta?: Record<string, unknown>;
  };
  assetId?: Asset["id"];
  repository: PostgresAssetRepository;
}) => {
  const asset = await repository.completeUpload({
    name,
    data: body,
    assetInfoFallback,
    assetDataOverride: assetInfoOverride,
    assetId,
  });
  return json(
    {
      uploadedAssets: [asset],
      deduplicated: false,
    } satisfies AssetActionResponse,
    {
      headers: privateNoStoreResponseHeaders,
    }
  );
};

const createDeduplicatedAssetResponse = (asset: Asset) => {
  return json(
    {
      uploadedAssets: [asset],
      deduplicated: true,
    } satisfies AssetActionResponse,
    {
      headers: privateNoStoreResponseHeaders,
    }
  );
};

const createRequestBody = (data: Uint8Array) =>
  new Blob([data as Uint8Array<ArrayBuffer>]).stream();

const readRequestBody = async (
  body: ReadableStream<Uint8Array>,
  name: string
) =>
  new Uint8Array(
    await arrayBuffer(
      createSizeLimiter(
        getMaxAssetUploadSize(),
        name
      )(body as unknown as AsyncIterable<Uint8Array>)
    )
  );

export const action = async (props: ActionFunctionArgs) => {
  preventCrossOriginCookie(props.request);

  const { request, params } = props;

  if (params.name === undefined) {
    throw new AssetRestRequestError("Asset name is required");
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const folderId = url.searchParams.get("folderId") ?? undefined;
  const description =
    request.headers.get("x-webstudio-asset-description") ?? undefined;
  const rawAssetMeta = request.headers.get("x-webstudio-asset-meta");
  const rawAssetType = url.searchParams.get("type");
  const isApiUpload = projectId !== null || rawAssetType !== null;

  if (isApiUpload === false && requiresAssetMutationCsrf(request)) {
    await checkCsrf(request);
  }

  try {
    if (
      request.method.toLowerCase() !==
        assetResourceApiOperations.uploadAssetContent.method ||
      request.body === null
    ) {
      return assetRestMethodNotAllowed(["POST"]);
    }

    const assetType = parseAssetType(rawAssetType);

    if (isApiUpload) {
      if (isAssetFileName(params.name) === false) {
        throw new AssetRestRequestError("Asset name is invalid");
      }
      if (projectId === null) {
        throw new AssetRestRequestError("Project id is required");
      }
      if (assetType === undefined) {
        throw new AssetRestRequestError("Asset type is invalid");
      }
      const assetInfoFallback = getAssetInfoFallback({
        format:
          assetType === "image"
            ? (url.searchParams.get("format") ?? undefined)
            : undefined,
        searchParams: url.searchParams,
      });
      const assetInfoOverride = assetDataOverride.parse({
        format: url.searchParams.get("format") ?? undefined,
        meta: rawAssetMeta === null ? undefined : JSON.parse(rawAssetMeta),
      });

      const context = await createContext(request);
      await assertApiProjectPermit(context, projectId, "build");
      const data = await readRequestBody(request.body, params.name);
      const force = url.searchParams.get("force") === "true";
      const assetClient = createAssetClient();
      const repository = new PostgresAssetRepository({
        projectId,
        context,
        assetClient,
      });
      const ticket = await repository.createUploadTicket({
        type: assetType,
        filename: params.name,
        description,
        folderId,
        contentHash: force ? undefined : await getContentHash(data),
      });
      if (ticket.deduplicated) {
        return createDeduplicatedAssetResponse(ticket.asset);
      }
      return await createAssetUploadResponse({
        body: createRequestBody(data),
        name: ticket.name,
        assetInfoFallback,
        assetInfoOverride,
        assetId: ticket.assetId,
        repository,
      });
    }

    const contentType = request.headers.get("Content-Type");
    const body = await getBrowserUploadBody(request, contentType);
    const format = getBrowserAssetFormat({ contentType, name: params.name });
    const assetInfoFallback = getAssetInfoFallback({
      format,
      searchParams: url.searchParams,
    });

    const context = await createContext(request);
    const assetClient = createAssetClient();
    const repository = await PostgresAssetRepository.forUpload({
      name: params.name,
      context,
      assetStore: assetClient,
    });
    return await createAssetUploadResponse({
      body,
      name: params.name,
      assetInfoFallback,
      repository,
    });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
