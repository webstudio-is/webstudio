import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { z } from "zod";
import { ensureApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestIdentifier,
  readAssetRestJson,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

const requestSchema = z.object({
  values: z.record(z.string(), z.json()),
});

export const loader = async () =>
  assetRestMethodNotAllowed([{ method: "post" }]);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (request.method.toLowerCase() !== "post") {
    return assetRestMethodNotAllowed([{ method: "post" }]);
  }
  await ensureApiCsrf(request);
  try {
    const folderId = parseAssetRestIdentifier(params.folderId);
    const { values } = requestSchema.parse(await readAssetRestJson(request));
    const asset = await (
      await createAssetRestRepository(request, "edit")
    ).createCollectionEntry({ folderId, values });
    return json(
      { asset },
      { status: 201, headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
