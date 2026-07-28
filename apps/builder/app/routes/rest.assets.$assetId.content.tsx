import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { type Asset } from "@webstudio-is/sdk";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createAssetContentLoader } from "~/services/asset-rest-route-handlers.server";
import { requiresApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestFilename,
  parseAssetRestIdentifier,
} from "~/services/asset-rest.server";

export type AssetContentActionResponse = { asset: Asset } | { errors: string };

export const loader = createAssetContentLoader();

export const action = async ({ request, params }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (requiresApiCsrf(request)) {
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
    const assetId = parseAssetRestIdentifier(params.assetId);

    const url = new URL(request.url);
    const expectedName = parseAssetRestFilename(
      url.searchParams.get("expectedName")
    );

    const asset = await (
      await createAssetRestRepository(request, "edit")
    ).updateContent({
      assetId,
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
