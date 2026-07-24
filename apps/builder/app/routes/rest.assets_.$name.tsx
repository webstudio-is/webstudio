import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { arrayBuffer } from "node:stream/consumers";
import {
  createSizeLimiter,
  assetDataOverride,
  getContentHash,
  uploadFile,
  type UploadErrorCleanup,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/index.server";
import { isAssetFileName } from "@webstudio-is/protocol";
import type { Asset } from "@webstudio-is/sdk";
import type { AssetActionResponse } from "~/builder/shared/assets";
import {
  createAssetClient,
  getMaxAssetUploadSize,
} from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { assertApiProjectPermit } from "~/services/api-permits.server";
import {
  getAssetInfoFallback,
  getBrowserAssetFormat,
  parseAssetType,
  type AssetInfoFallback,
} from "@webstudio-is/project-build/runtime";
import { getBrowserUploadBody } from "~/services/asset-upload.server";

const createAssetUploadResponse = async ({
  body,
  context,
  name,
  assetInfoFallback,
  assetInfoOverride,
  onUploadError,
  assetClient = createAssetClient(),
}: {
  body: ReadableStream<Uint8Array>;
  context: Awaited<ReturnType<typeof createContext>>;
  name: string;
  assetInfoFallback: AssetInfoFallback;
  assetInfoOverride?: {
    format?: string;
    meta?: Record<string, unknown>;
  };
  onUploadError?: UploadErrorCleanup;
  assetClient?: ReturnType<typeof createAssetClient>;
}) => {
  const asset = await uploadFile(
    name,
    body,
    assetClient,
    context,
    assetInfoFallback,
    assetInfoOverride,
    onUploadError
  );
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

const createApiUploadErrorCleanup =
  (assetId: string, projectId: string): UploadErrorCleanup =>
  async (name, context) => {
    const deleteAsset = await context.postgrest.client
      .from("Asset")
      .delete()
      .eq("id", assetId)
      .eq("projectId", projectId);
    if (deleteAsset.error) {
      throw deleteAsset.error;
    }
    const deleteFile = await context.postgrest.client
      .from("File")
      .delete()
      .eq("name", name);
    if (deleteFile.error) {
      throw deleteFile.error;
    }
  };

export const action = async (props: ActionFunctionArgs) => {
  preventCrossOriginCookie(props.request);

  const { request, params } = props;

  if (params.name === undefined) {
    throw new Error("Name is undefined");
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const folderId = url.searchParams.get("folderId") ?? undefined;
  const description =
    request.headers.get("x-webstudio-asset-description") ?? undefined;
  const rawAssetMeta = request.headers.get("x-webstudio-asset-meta");
  const rawAssetType = url.searchParams.get("type");
  const isApiUpload = projectId !== null || rawAssetType !== null;

  if (isApiUpload === false) {
    await checkCsrf(request);
  }

  try {
    if (request.method !== "POST" || request.body === null) {
      return json(
        { errors: "Method not allowed" } satisfies AssetActionResponse,
        { status: 405, headers: privateNoStoreResponseHeaders }
      );
    }

    const assetType = parseAssetType(rawAssetType);

    if (isApiUpload) {
      if (isAssetFileName(params.name) === false) {
        throw new Error("Asset name is invalid");
      }
      if (projectId === null) {
        throw new Error("Project id is required");
      }
      if (assetType === undefined) {
        throw new Error("Asset type is invalid");
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
      const ticket = await new PostgresAssetRepository({
        projectId,
        context,
        assetClient,
      }).createUploadTicket({
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
        context,
        name: ticket.name,
        assetInfoFallback,
        assetInfoOverride,
        onUploadError: createApiUploadErrorCleanup(ticket.assetId, projectId),
        assetClient,
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
    return await createAssetUploadResponse({
      body,
      context,
      name: params.name,
      assetInfoFallback,
    });
  } catch (error) {
    console.error(error);
    return json(
      { errors: parseError(error).message } satisfies AssetActionResponse,
      { headers: privateNoStoreResponseHeaders }
    );
  }
};
