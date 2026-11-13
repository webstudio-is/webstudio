import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createAssetContentLoader } from "~/services/asset-rest-route-handlers.server";
import { ensureApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestFilename,
  parseAssetRestIdentifier,
  requireAssetRestBody,
} from "~/services/asset-rest.server";

export const loader = createAssetContentLoader();

export const action = async ({ request, params }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.replaceAssetContent.method
  ) {
    return assetRestMethodNotAllowed([
      assetResourceApiOperations.replaceAssetContent,
    ]);
  }
  await ensureApiCsrf(request);

  try {
    const assetId = parseAssetRestIdentifier(params.assetId);

    const url = new URL(request.url);
    const expectedName = parseAssetRestFilename(
      url.searchParams.get("expectedName")
    );
    const extensionValue = url.searchParams.get("extension");
    const extension =
      extensionValue === null
        ? undefined
        : parseAssetRestFilename(extensionValue);

    const asset = await (
      await createAssetRestRepository(request, "edit")
    ).updateContent({
      assetId,
      expectedName,
      extension,
      data: requireAssetRestBody(request),
    });
    return json(
      { asset },
      {
        headers: privateNoStoreResponseHeaders,
      }
    );
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
