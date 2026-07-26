import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { assetResourceApiOperations } from "@webstudio-is/sdk/asset-resource-api";
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
} from "./asset-rest.server";
import { requiresAssetMutationCsrf } from "./asset-rest-auth.server";
import { checkCsrf } from "./csrf-session.server";
import { preventCrossOriginCookie } from "./no-cross-origin-cookie";

const defaultDependencies = {
  preventCrossOriginCookie,
  checkCsrf,
  createRepository: createAssetRestRepository,
};

export const createAssetIndexRefreshAction =
  (dependencies = defaultDependencies) =>
  async ({ request }: ActionFunctionArgs) => {
    dependencies.preventCrossOriginCookie(request);
    if (requiresAssetMutationCsrf(request)) {
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

export const action = createAssetIndexRefreshAction();
