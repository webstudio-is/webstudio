import type { PageContextServer } from "vike/types";
import { isLocalResource, loadResources } from "@webstudio-is/sdk/runtime";
import {
  getPageMeta,
  getResources,
} from "../../app/__generated__/[redirect]._index.server";
import { assets } from "../../app/__generated__/$resources.assets";
import {
  assetQueryDeploymentId,
  assetQueryManifest,
} from "../../app/__generated__/$resources.asset-query-manifest";
import { createSsgAssetResourceFetch } from "../../app/asset-resource-fetch";

const fetchAssetResource = createSsgAssetResourceFetch({
  deploymentId: assetQueryDeploymentId,
  manifest: assetQueryManifest,
});

const customFetch: typeof fetch = async (input, init) => {
  const assetResourceResponse = await fetchAssetResource(input, init);
  if (assetResourceResponse !== undefined) {
    return assetResourceResponse;
  }
  if (typeof input !== "string") {
    return fetch(input, init);
  }

  if (isLocalResource(input, "current-date")) {
    const now = new Date();
    // Normalize to midnight UTC to prevent hydration mismatches
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const data = {
      iso: startOfDay.toISOString(),
      year: startOfDay.getUTCFullYear(),
      month: startOfDay.getUTCMonth() + 1, // 1-12 instead of 0-11
      day: startOfDay.getUTCDate(),
      timestamp: startOfDay.getTime(),
    };
    const response = new Response(JSON.stringify(data));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return response;
  }

  if (isLocalResource(input, "assets")) {
    const response = new Response(JSON.stringify(assets));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return response;
  }

  return fetch(input, init);
};

export const data = async (pageContext: PageContextServer) => {
  const url = new URL(pageContext.urlOriginal, "http://url");
  const headers = new Headers(pageContext.headers ?? {});
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  url.host = host;
  url.protocol = "https";

  const params = pageContext.routeParams;
  const system = {
    params,
    search: Object.fromEntries(url.searchParams),
    origin: url.origin,
    pathname: url.pathname,
  };

  const resources = await loadResources(
    customFetch,
    getResources({ system }).data,
    url
  );
  const pageMeta = getPageMeta({ system, resources });

  return {
    url: url.href,
    system,
    resources,
    pageMeta,
  } satisfies PageContextServer["data"];
};
