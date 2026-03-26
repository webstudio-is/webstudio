import type { PageContextServer } from "vike/types";
import { isLocalResource, loadResources } from "@webstudio-is/sdk/runtime";
import {
  getPageMeta,
  getResources,
} from "../../app/__generated__/[another-page]._index.server";
import { assets } from "../../app/__generated__/$resources.assets";

const customFetch: typeof fetch = (input, init) => {
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
    return Promise.resolve(response);
  }

  if (isLocalResource(input, "assets")) {
    const response = new Response(JSON.stringify(assets));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return Promise.resolve(response);
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
    getResources({ system }).data
  );
  const pageMeta = getPageMeta({ system, resources });

  return {
    url: url.href,
    system,
    resources,
    pageMeta,
  } satisfies PageContextServer["data"];
};
