// These are the utils for manipulating "build" params.
// "Build" means user generated content — what user builds.

import serverEnv from "~/env/env.server";

export type BuildParams = ({ pagePath: string } | { pageId: string }) &
  ({ projectId: string } | { projectDomain: string });

// A subtype of Request. To make testing easier.
type MinimalRequest = {
  url: string;
  headers: { get: (name: string) => string | null };
};

export const getRequestHost = (request: MinimalRequest): string =>
  request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

const isLocalhost = (host: string) => {
  // remove port if present
  const [domain] = host.split(":");
  return domain === "localhost" || domain.endsWith(".localhost");
};

const defaultEnv = {
  BUILD_ORIGIN: serverEnv.BUILD_ORIGIN,
  DEPLOYMENT_ENVIRONMENT: serverEnv.DEPLOYMENT_ENVIRONMENT,
  DEPLOYMENT_URL: serverEnv.DEPLOYMENT_URL,
  BUILD_REQUIRE_SUBDOMAIN: serverEnv.BUILD_REQUIRE_SUBDOMAIN,
};

export const getBuildOrigin = (
  request: MinimalRequest,
  env: {
    BUILD_ORIGIN?: string;
    DEPLOYMENT_ENVIRONMENT?: string;
    DEPLOYMENT_URL?: string;
  } = defaultEnv
): string => {
  const { BUILD_ORIGIN } = env;
  if (BUILD_ORIGIN !== undefined && BUILD_ORIGIN !== "") {
    return BUILD_ORIGIN;
  }

  // Local development special case
  const host = getRequestHost(request);

  if (isLocalhost(host)) {
    return `http://${host.split(".").pop()}`;
  }
  // If we're not on localhost, we're probably using ip address - useful for remote development
  if (
    /(\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?::\d{0,4})?\b)/.test(
      host
    )
  ) {
    return `http://${host}`;
  }

  // Vercel preview special case
  if (
    (env.DEPLOYMENT_ENVIRONMENT === "preview" ||
      env.DEPLOYMENT_ENVIRONMENT === "development") &&
    typeof env.DEPLOYMENT_URL === "string"
  ) {
    return `https://${env.DEPLOYMENT_URL}`;
  }

  throw new Error("Could not determine user content host");
};

export const getBuildParams = (
  request: MinimalRequest,
  env: {
    BUILD_REQUIRE_SUBDOMAIN?: string;
    BUILD_ORIGIN?: string;
    DEPLOYMENT_ENVIRONMENT?: string;
    DEPLOYMENT_URL?: string;
  } = defaultEnv
): BuildParams | undefined => {
  const url = new URL(request.url);

  // Having that we use Remix `export const links` and have no way to pass
  // projectId and other params here, we need to get them from referer.
  if (url.pathname === "/s/css") {
    const referer = request.headers.get("referer");
    if (referer !== null) {
      // Try to get projectId from referrer
      const refererUrl = new URL(referer);
      const projectId = refererUrl.searchParams.get("projectId");
      const pageId = url.searchParams.get("pageId") ?? undefined;

      if (projectId !== null) {
        return pageId === undefined
          ? { projectId, pagePath: refererUrl.pathname }
          : { projectId, pageId };
      }
    }
  }

  const requestHost = getRequestHost(request);
  const buildHost = new URL(getBuildOrigin(request, env)).host;
  const pageId = url.searchParams.get("pageId") ?? undefined;

  if (env.BUILD_REQUIRE_SUBDOMAIN !== "true") {
    const projectId = url.searchParams.get("projectId");
    if (projectId !== null && buildHost === requestHost) {
      return pageId === undefined
        ? { projectId, pagePath: url.pathname }
        : { projectId, pageId };
    }
  }

  const [projectDomain, ...rest] = requestHost.split(".");
  const baseHost = rest.join(".");
  if (baseHost === buildHost) {
    return pageId === undefined
      ? { projectDomain, pagePath: url.pathname }
      : { projectDomain, pageId };
  }
};
