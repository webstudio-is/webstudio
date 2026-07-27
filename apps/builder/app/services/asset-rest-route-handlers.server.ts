import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { Readable } from "node:stream";
import parseRange from "range-parser";
import {
  type AssetRepository,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/server";
import { getAssetMime } from "@webstudio-is/sdk";
import {
  assetMetadataUpdate,
  assetResourceApiOperations,
} from "@webstudio-is/protocol/asset-resource-api";
import { createAssetClient } from "~/shared/asset-client";
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import { authorizeApiProject, requiresApiCsrf } from "./api-auth.server";
import {
  AssetRestRangeError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestIdentifier,
  readAssetRestJson,
} from "./asset-rest.server";
import { checkCsrf } from "./csrf-session.server";
import { preventCrossOriginCookie } from "./no-cross-origin-cookie";

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

type AssetContentLoaderDependencies = {
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
  createRepository: typeof createAssetRestRepository;
};

const defaultAssetContentLoaderDependencies: AssetContentLoaderDependencies = {
  preventCrossOriginCookie,
  createRepository: createAssetRestRepository,
};

export const createAssetContentLoader =
  (
    dependencies: AssetContentLoaderDependencies = defaultAssetContentLoaderDependencies
  ) =>
  async ({ request, params }: LoaderFunctionArgs) => {
    dependencies.preventCrossOriginCookie(request);
    if (
      request.method.toLowerCase() !==
      assetResourceApiOperations.downloadAssetContent.method
    ) {
      return assetRestMethodNotAllowed(["GET"]);
    }
    try {
      const assetId = parseAssetRestIdentifier(params.assetId);
      const repository = await dependencies.createRepository(request, "view");
      const asset = await repository.get(assetId);
      const range = parseRequestRange(request.headers.get("range"), asset.size);
      const content = await repository.readContent({ assetId, range, asset });
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

type AssetActionDependencies = {
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
  checkCsrf: typeof checkCsrf;
  authorizeApiProject: typeof authorizeApiProject;
  createAssetClient: typeof createAssetClient;
  createRepository: (
    input: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => Pick<AssetRepository, "updateMetadata" | "delete">;
};

const defaultAssetActionDependencies: AssetActionDependencies = {
  preventCrossOriginCookie,
  checkCsrf,
  authorizeApiProject,
  createAssetClient,
  createRepository: (input) => new PostgresAssetRepository(input),
};

export const createAssetAction =
  (dependencies: AssetActionDependencies = defaultAssetActionDependencies) =>
  async ({ request, params }: ActionFunctionArgs) => {
    dependencies.preventCrossOriginCookie(request);
    if (requiresApiCsrf(request)) {
      await dependencies.checkCsrf(request);
    }

    try {
      const assetId = parseAssetRestIdentifier(params.assetId);
      const projectId = parseAssetRestIdentifier(
        new URL(request.url).searchParams.get("projectId")
      );
      const context = await dependencies.authorizeApiProject(
        request,
        projectId,
        "edit"
      );
      const repository = dependencies.createRepository({
        projectId,
        context,
        assetStore: dependencies.createAssetClient(),
      });

      if (
        request.method.toLowerCase() ===
        assetResourceApiOperations.updateAsset.method
      ) {
        const asset = await repository.updateMetadata(
          assetId,
          assetMetadataUpdate.parse(await readAssetRestJson(request))
        );
        return json({ asset }, { headers: privateNoStoreResponseHeaders });
      }
      if (
        request.method.toLowerCase() ===
        assetResourceApiOperations.deleteAsset.method
      ) {
        await repository.delete([assetId]);
        return new Response(null, {
          status: 204,
          headers: privateNoStoreResponseHeaders,
        });
      }
      return assetRestMethodNotAllowed(["PATCH", "DELETE"]);
    } catch (error) {
      return assetRestErrorResponse(error);
    }
  };

const defaultAssetIndexRefreshDependencies = {
  preventCrossOriginCookie,
  checkCsrf,
  createRepository: createAssetRestRepository,
};

export const createAssetIndexRefreshAction =
  (dependencies = defaultAssetIndexRefreshDependencies) =>
  async ({ request }: ActionFunctionArgs) => {
    dependencies.preventCrossOriginCookie(request);
    if (requiresApiCsrf(request)) {
      await dependencies.checkCsrf(request);
    }
    if (
      request.method.toLowerCase() !==
      assetResourceApiOperations.refreshAssetIndex.method
    ) {
      return assetRestMethodNotAllowed(["POST"]);
    }
    try {
      const result = await (
        await dependencies.createRepository(request, "build")
      ).synchronize();
      return json(result, {
        status: result.issues.length === 0 ? 200 : 503,
        headers: privateNoStoreResponseHeaders,
      });
    } catch (error) {
      return assetRestErrorResponse(error);
    }
  };
