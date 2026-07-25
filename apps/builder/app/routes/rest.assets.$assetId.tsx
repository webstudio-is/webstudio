import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  type AssetRepository,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/index.server";
import {
  assetMetadataUpdate,
  assetResourceApiOperations,
} from "@webstudio-is/sdk/asset-resource-api";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { requiresAssetMutationCsrf } from "~/services/asset-rest-auth.server";
import { checkCsrf } from "~/services/csrf-session.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import {
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
} from "~/services/asset-rest.server";

type Dependencies = {
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
  checkCsrf: typeof checkCsrf;
  createContext: typeof createContext;
  createAssetClient: typeof createAssetClient;
  createRepository: (
    input: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => Pick<AssetRepository, "updateMetadata" | "delete">;
};

const defaultDependencies: Dependencies = {
  preventCrossOriginCookie,
  checkCsrf,
  createContext,
  createAssetClient,
  createRepository: (input) => new PostgresAssetRepository(input),
};

export const createAssetAction =
  (dependencies: Dependencies = defaultDependencies) =>
  async ({ request, params }: ActionFunctionArgs) => {
    dependencies.preventCrossOriginCookie(request);
    if (requiresAssetMutationCsrf(request)) {
      await dependencies.checkCsrf(request);
    }

    try {
      if (params.assetId === undefined) {
        throw new AssetRestRequestError("Asset id is required");
      }
      const projectId = new URL(request.url).searchParams.get("projectId");
      if (projectId === null) {
        throw new AssetRestRequestError("Project id is required");
      }

      const context = await dependencies.createContext(request);
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
          params.assetId,
          assetMetadataUpdate.parse(await request.json())
        );
        return json({ asset }, { headers: privateNoStoreResponseHeaders });
      }
      if (
        request.method.toLowerCase() ===
        assetResourceApiOperations.deleteAsset.method
      ) {
        await repository.delete([params.assetId]);
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

export const action = createAssetAction();

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !== assetResourceApiOperations.getAsset.method
  ) {
    return assetRestMethodNotAllowed(["GET"]);
  }
  try {
    if (params.assetId === undefined) {
      throw new AssetRestRequestError("Asset id is required");
    }
    const asset = await (
      await createAssetRestRepository(request)
    ).get(params.assetId);
    return json({ asset }, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
