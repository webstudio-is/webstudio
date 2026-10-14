import { type ActionFunctionArgs, data, json } from "@remix-run/server-runtime";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { isLocalResource } from "@webstudio-is/sdk/runtime";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { loader as siteMapLoader } from "../shared/$resources/sitemap.xml.server";
import { loader as currentDateLoader } from "../shared/$resources/current-date.server";
import { loader as assetsFieldCatalogLoader } from "./rest.assets.field-catalog";
import { executeAssetQuery } from "../shared/$resources/assets-query.server";
import { loader as assetsOpenApiLoader } from "./rest.assets.openapi[.]json";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { safeResourceFetch } from "~/services/safe-resource-fetch.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createContext } from "~/shared/context.server";
import {
  loadResourceRequestList,
  resourceRequestListSchema,
} from "~/services/resource-list-loader.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  const { projectId, sourceOrigin } = parseBuilderUrl(request.url);
  if (projectId === undefined) {
    throw new Response("Project ID is not defined", { status: 404 });
  }

  const context = await createContext(request);
  if (
    context.authorization.type === "anonymous" ||
    context.authorization.type === "service"
  ) {
    throw new Response("Authentication required", { status: 401 });
  }
  if (
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    )) === false
  ) {
    throw new Response("You don't have access to this project", {
      status: 403,
    });
  }

  await checkCsrf(request);
  const searchParams = new URL(request.url).searchParams;
  const includeDiagnostics = searchParams.get("diagnostics") === "true";
  const inspectResourceKey = searchParams.get("inspect") ?? undefined;

  // Hope Remix will have customFetch by default, see https://kit.svelte.dev/docs/load#making-fetch-requests
  const customFetch: typeof fetch = (input, init) => {
    if (typeof input !== "string") {
      return Promise.reject(
        new TypeError("Resource loader requires a URL string")
      );
    }

    if (isLocalResource(input, "sitemap.xml")) {
      return siteMapLoader({ request });
    }

    if (isLocalResource(input, "current-date")) {
      return currentDateLoader({ request });
    }

    if (isLocalResource(input, "assets")) {
      const resourceRequest = new Request(new URL(input, request.url), init);
      return executeAssetQuery({
        request,
        resourceRequest,
        includeDiagnostics,
      });
    }

    if (isLocalResource(input, "assets/field-catalog")) {
      return assetsFieldCatalogLoader({ request });
    }

    if (isLocalResource(input, "assets/openapi.json")) {
      return assetsOpenApiLoader({ request });
    }

    return safeResourceFetch(input, init);
  };

  const requestJson = await request.json();
  const requestList = resourceRequestListSchema.safeParse(requestJson);

  if (requestList.success === false) {
    throw data(requestList.error, {
      status: 400,
      headers: privateNoStoreResponseHeaders,
    });
  }

  const loaderInput = {
    request,
    requestList: requestList.data,
    sourceOrigin,
    includeDiagnostics,
    customFetch,
  };
  const output =
    inspectResourceKey === undefined
      ? await loadResourceRequestList(loaderInput)
      : await loadResourceRequestList({ ...loaderInput, inspectResourceKey });

  return json(output, { headers: privateNoStoreResponseHeaders });
};
