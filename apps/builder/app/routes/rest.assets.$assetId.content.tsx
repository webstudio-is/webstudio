import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { PostgresAssetRepository } from "@webstudio-is/asset-uploader/server";
import { type Asset } from "@webstudio-is/sdk";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { createAssetClient } from "~/shared/asset-client";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createAssetContentLoader } from "~/services/asset-rest-route-handlers.server";
import {
  authorizeApiProject,
  requiresApiCsrf,
} from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
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
    const projectId = parseAssetRestIdentifier(
      url.searchParams.get("projectId")
    );
    const expectedName = parseAssetRestFilename(
      url.searchParams.get("expectedName")
    );

    const context = await authorizeApiProject(request, projectId, "edit");
    const asset = await new PostgresAssetRepository({
      projectId,
      context,
      assetClient: createAssetClient(),
    }).updateContent({
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
