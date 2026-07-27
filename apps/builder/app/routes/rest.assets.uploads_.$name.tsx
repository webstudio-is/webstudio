import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { arrayBuffer } from "node:stream/consumers";
import {
  createSizeLimiter,
  assetDataOverride,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/server";
import { isAssetFileName } from "@webstudio-is/protocol";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { getAssetContentHash, type Asset } from "@webstudio-is/sdk";
import type { AssetActionResponse } from "~/builder/shared/assets";
import {
  createAssetClient,
  getMaxAssetUploadSize,
} from "~/shared/asset-client";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import {
  authorizeApiProject,
  requiresApiCsrf,
} from "~/services/api-auth.server";
import { createContext } from "~/shared/context.server";
import {
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  parseAssetRestDescription,
  parseAssetRestFilename,
  parseAssetRestIdentifier,
  parseAssetRestMetadataHeader,
} from "~/services/asset-rest.server";
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
  const folderIdValue = url.searchParams.get("folderId");
  const rawAssetMeta = request.headers.get("x-webstudio-asset-meta");
  const rawAssetType = url.searchParams.get("type");
  const isApiUpload = projectId !== null || rawAssetType !== null;

  if (requiresApiCsrf(request)) {
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
      const filename = parseAssetRestFilename(params.name);
      if (isAssetFileName(filename) === false) {
        throw new AssetRestRequestError("Asset name is invalid");
      }
      const parsedProjectId = parseAssetRestIdentifier(projectId);
      const folderId =
        folderIdValue === null
          ? undefined
          : parseAssetRestIdentifier(folderIdValue);
      const description = parseAssetRestDescription(
        request.headers.get("x-webstudio-asset-description")
      );
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
        meta: parseAssetRestMetadataHeader(rawAssetMeta),
      });

      const context = await authorizeApiProject(
        request,
        parsedProjectId,
        "edit"
      );
      const data = await readRequestBody(request.body, params.name);
      const force = url.searchParams.get("force") === "true";
      const assetClient = createAssetClient();
      const repository = new PostgresAssetRepository({
        projectId: parsedProjectId,
        context,
        assetClient,
      });
      const ticket = await repository.createUploadTicket({
        type: assetType,
        filename,
        description,
        folderId,
        contentHash: force ? undefined : await getAssetContentHash(data),
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
