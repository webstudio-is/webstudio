import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { Readable } from "node:stream";
import parseRange from "range-parser";
import { PostgresAssetRepository } from "@webstudio-is/asset-uploader/index.server";
import { getAssetMime, type Asset } from "@webstudio-is/sdk";
import { assetResourceApiOperations } from "@webstudio-is/sdk/asset-resource-api";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { requiresAssetMutationCsrf } from "~/services/asset-rest-auth.server";
import {
  AssetRestRangeError,
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
} from "~/services/asset-rest.server";

export type AssetContentActionResponse = { asset: Asset } | { errors: string };

export const parseRequestRange = (value: string | null, size: number) => {
  if (value === null) {
    return;
  }
  const parsed = parseRange(size, value, { combine: true });
  if (
    typeof parsed === "number" ||
    parsed.type !== "bytes" ||
    parsed.length !== 1
  ) {
    throw new AssetRestRangeError("A single valid byte range is required");
  }
  const [{ start, end }] = parsed;
  return { offset: start, length: end - start + 1 };
};

type LoaderDependencies = {
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
  createRepository: typeof createAssetRestRepository;
};

const defaultLoaderDependencies: LoaderDependencies = {
  preventCrossOriginCookie,
  createRepository: createAssetRestRepository,
};

export const createAssetContentLoader =
  (dependencies: LoaderDependencies = defaultLoaderDependencies) =>
  async ({ request, params }: LoaderFunctionArgs) => {
    dependencies.preventCrossOriginCookie(request);
    if (
      request.method.toLowerCase() !==
      assetResourceApiOperations.downloadAssetContent.method
    ) {
      return assetRestMethodNotAllowed(["GET"]);
    }
    try {
      if (params.assetId === undefined) {
        throw new AssetRestRequestError("Asset id is required");
      }
      const repository = await dependencies.createRepository(request);
      const asset = await repository.get(params.assetId);
      const range = parseRequestRange(request.headers.get("range"), asset.size);
      const content = await repository.readContent(params.assetId, range);
      const headers = new Headers(privateNoStoreResponseHeaders);
      headers.set(
        "content-type",
        getAssetMime(asset) ?? "application/octet-stream"
      );
      headers.set("accept-ranges", "bytes");
      headers.set(
        "content-length",
        String(content.contentLength ?? range?.length ?? asset.size)
      );
      if (range !== undefined) {
        headers.set(
          "content-range",
          `bytes ${range.offset}-${range.offset + range.length - 1}/${asset.size}`
        );
      }
      return new Response(
        Readable.toWeb(Readable.from(content.data)) as ReadableStream,
        { status: range === undefined ? 200 : 206, headers }
      );
    } catch (error) {
      return assetRestErrorResponse(error);
    }
  };

export const loader = createAssetContentLoader();

export const action = async ({ request, params }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (requiresAssetMutationCsrf(request)) {
    await checkCsrf(request);
  }

  try {
    if (
      request.method.toLowerCase() !==
        assetResourceApiOperations.replaceAssetContent.method ||
      request.body === null
    ) {
      return assetRestMethodNotAllowed(["PUT"]);
    }
    if (params.assetId === undefined) {
      throw new AssetRestRequestError("Asset id is required");
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const expectedName = url.searchParams.get("expectedName");
    if (projectId === null || expectedName === null) {
      throw new AssetRestRequestError(
        "Project id and expected asset name are required"
      );
    }

    const context = await createContext(request);
    const asset = await new PostgresAssetRepository({
      projectId,
      context,
      assetClient: createAssetClient(),
    }).updateContent({
      assetId: params.assetId,
      expectedName,
      data: request.body,
    });
    return json({ asset } satisfies AssetContentActionResponse, {
      headers: privateNoStoreResponseHeaders,
    });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
