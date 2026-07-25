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
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import {
  createAssetRestContext,
  requiresAssetMutationCsrf,
} from "./asset-rest-auth.server";
import { checkCsrf } from "./csrf-session.server";
import { preventCrossOriginCookie } from "./no-cross-origin-cookie";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestIdentifier,
  readAssetRestJson,
} from "./asset-rest.server";

type Dependencies = {
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
  checkCsrf: typeof checkCsrf;
  createContext: typeof createAssetRestContext;
  createAssetClient: typeof createAssetClient;
  createRepository: (
    input: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => Pick<AssetRepository, "updateMetadata" | "delete">;
};

const defaultDependencies: Dependencies = {
  preventCrossOriginCookie,
  checkCsrf,
  createContext: createAssetRestContext,
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
      const assetId = parseAssetRestIdentifier(params.assetId);
      const projectId = parseAssetRestIdentifier(
        new URL(request.url).searchParams.get("projectId")
      );

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

export const action = createAssetAction();

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !== assetResourceApiOperations.getAsset.method
  ) {
    return assetRestMethodNotAllowed(["GET"]);
  }
  try {
    const assetId = parseAssetRestIdentifier(params.assetId);
    const asset = await (await createAssetRestRepository(request)).get(assetId);
    return json({ asset }, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
