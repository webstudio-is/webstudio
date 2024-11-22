import type { PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { loadResources } from "@webstudio-is/sdk/runtime";
import {
  getPageMeta,
  getResources,
} from "../../app/__generated__/_index.server";

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
  };

  const resources = await loadResources(fetch, getResources({ system }).data);
  const pageMeta = getPageMeta({ system, resources });

  if (pageMeta.redirect) {
    const status =
      pageMeta.status === 301 || pageMeta.status === 302
        ? pageMeta.status
        : 302;
    throw redirect(pageMeta.redirect, status);
  }

  return {
    url: url.href,
    system,
    resources,
    pageMeta,
  } satisfies PageContextServer["data"];
};
