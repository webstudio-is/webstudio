import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import {
  AssetRevisionConflictError,
  updateAssetContent,
} from "@webstudio-is/asset-uploader/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { createAssetClient } from "~/shared/asset-client";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";

export type AssetContentActionResponse = { asset: Asset } | { errors: string };

export const action = async ({ request, params }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (request.headers.has("x-auth-token") === false) {
    await checkCsrf(request);
  }

  try {
    if (request.method !== "PUT" || request.body === null) {
      return json(
        { errors: "Method not allowed" } satisfies AssetContentActionResponse,
        { status: 405, headers: privateNoStoreResponseHeaders }
      );
    }
    if (params.assetId === undefined) {
      throw new Error("Asset id is required");
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const expectedName = url.searchParams.get("expectedName");
    if (projectId === null || expectedName === null) {
      throw new Error("Project id and expected asset name are required");
    }

    const context = await createContext(request);
    const asset = await updateAssetContent(
      {
        assetId: params.assetId,
        projectId,
        expectedName,
        data: request.body,
      },
      createAssetClient(),
      context
    );
    return json({ asset } satisfies AssetContentActionResponse, {
      headers: privateNoStoreResponseHeaders,
    });
  } catch (error) {
    console.error(error);
    return json(
      {
        errors: parseError(error).message,
      } satisfies AssetContentActionResponse,
      {
        status: error instanceof AssetRevisionConflictError ? 409 : 400,
        headers: privateNoStoreResponseHeaders,
      }
    );
  }
};
