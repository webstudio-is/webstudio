import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import isValidFilename from "valid-filename";
import { z } from "zod";
import { contentEngineLimits } from "@webstudio-is/content-engine";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
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
  configAssetId: z.string().min(1),
  expectedConfigName: z.string().min(1),
  templateAssetId: z.string().min(1),
  expectedTemplateFilename: z.string().nullable(),
  templateFilename: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetFilenameCharacters)
    .refine((value) => isValidFilename(`${value}.mdx`)),
  configSource: z.string().min(1),
});

const collectionSettingsRequestBytes =
  contentEngineLimits.jsonBytes * 2 +
  assetResourceLimits.restMutationRequestBytes;

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
    const { expectedTemplateFilename, ...input } = requestSchema.parse(
      await readAssetRestJson(request, collectionSettingsRequestBytes)
    );
    const assets = await (
      await createAssetRestRepository(request, "build")
    ).updateCollectionConfigAndTemplateName({
      folderId,
      ...input,
      expectedTemplateFilename: expectedTemplateFilename ?? undefined,
    });
    return json(assets, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
