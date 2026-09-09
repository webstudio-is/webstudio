import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { z } from "zod";
import { assetFolderId, assetFolderName } from "@webstudio-is/sdk/schema";
import { ensureApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  readAssetRestJson,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

const collectionFolderCreateRequest = z.strictObject({
  id: assetFolderId,
  name: assetFolderName,
  parentId: assetFolderId.optional(),
});

export const loader = async () =>
  assetRestMethodNotAllowed([{ method: "post" }]);

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (request.method.toLowerCase() !== "post") {
    return assetRestMethodNotAllowed([{ method: "post" }]);
  }
  await ensureApiCsrf(request);
  try {
    const result = await (
      await createAssetRestRepository(request, "build")
    ).createCollectionFolder(
      collectionFolderCreateRequest.parse(await readAssetRestJson(request))
    );
    return json(result, {
      status: 201,
      headers: privateNoStoreResponseHeaders,
    });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
