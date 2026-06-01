import { type LoaderFunctionArgs, redirect } from "react-router";
import { isLocalResource, loadResources } from "@webstudio-is/sdk/runtime";
import { authenticateRequest } from "@webstudio-is/wsauth";
import { projectDomain } from "__CLIENT__";
import { getPageMeta, getRemixParams, getResources } from "__SERVER__";
import { sitemap } from "__SITEMAP__";
import { assets } from "__ASSETS__";
import { authRoutes } from "__AUTH__";

const authenticateProductionRequest = (request: Request) => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const requestHost = host.split(":")[0];
  if (
    projectDomain !== undefined &&
    (requestHost === projectDomain ||
      requestHost.startsWith(`${projectDomain}.`))
  ) {
    return;
  }

  return authenticateRequest(request, authRoutes);
};

const customFetch: typeof fetch = (input, init) => {
  if (typeof input !== "string") {
    return fetch(input, init);
  }

  if (isLocalResource(input, "sitemap.xml")) {
    const response = new Response(JSON.stringify(sitemap));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return Promise.resolve(response);
  }

  if (isLocalResource(input, "current-date")) {
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const data = {
      iso: startOfDay.toISOString(),
      year: startOfDay.getUTCFullYear(),
      month: startOfDay.getUTCMonth() + 1,
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

export const loader = async (arg: LoaderFunctionArgs) => {
  const authRoute = authenticateProductionRequest(arg.request);

  const url = new URL(arg.request.url);
  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";
  url.host = host;
  url.protocol = "https";

  const params = getRemixParams(arg.params);

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

  if (pageMeta.redirect) {
    const status =
      pageMeta.status === 301 || pageMeta.status === 302
        ? pageMeta.status
        : 302;
    return redirect(pageMeta.redirect, status);
  }

  return new Response(pageMeta.content ?? "", {
    status: pageMeta.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        authRoute === undefined ? "public, max-age=600" : "private, no-store",
    },
  });
};
