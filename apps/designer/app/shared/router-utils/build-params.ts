// These are the utils for manipulating "build" params.
// "Build" means user generated content — what user builds.

export type BuildMode = "edit" | "preview" | "published";
export type BuildParams = ({ pagePath: string } | { pageId: string }) &
  ({ projectId: string } | { projectDomain: string }) & { mode: BuildMode };

// A subtype of Request. To make testing easier.
type MinimalRequest = {
  url: string;
  headers: { get: (name: string) => string | null };
};

const modes = ["edit", "preview", "published"] as BuildMode[];
const getMode = (url: URL): BuildMode => {
  const modeParam = url.searchParams.get("mode");
  const mode =
    modeParam === null ? "published" : modes.find((mode) => mode === modeParam);
  if (mode === undefined) {
    throw new Error(`Invalid mode "${modeParam}"`);
  }
  return mode;
};

const getRequestHost = (request: MinimalRequest): string =>
  request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

const isLocalhost = (host: string) => {
  // remove port if present
  const [domain] = host.split(":");
  return domain === "localhost" || domain.endsWith(".localhost");
};

export const getBuildOrigin = (
  request: MinimalRequest,
  env = process.env
): string => {
  const { BUILD_ORIGIN } = env;
  if (BUILD_ORIGIN !== undefined && BUILD_ORIGIN !== "") {
    return BUILD_ORIGIN;
  }

  // Local development special case
  const host = getRequestHost(request);
  if (env.NODE_ENV === "development") {
    if (isLocalhost(host)) {
      return `http://${host.split(".").pop()}`;
    }
    // If we're not on localhost, we're probably using ip address - useful for remote development
    if (host.split(".").length === 4) {
      return `http://${host}`;
    }
  }

  // Vercel preview special case
  if (
    (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") &&
    typeof env.VERCEL_URL === "string"
  ) {
    return `https://${env.VERCEL_URL}`;
  }

  throw new Error("Could not determine user content host");
};

export const getBuildParams = (
  request: MinimalRequest,
  env = process.env
): BuildParams | undefined => {
  const url = new URL(request.url);

  const requestHost = getRequestHost(request);
  const buildHost = new URL(getBuildOrigin(request, env)).host;
  const pageId = url.searchParams.get("pageId") ?? undefined;

  if (env.BUILD_REQUIRE_SUBDOMAIN !== "true") {
    const projectId = url.searchParams.get("projectId");
    if (projectId !== null && buildHost === requestHost) {
      return pageId === undefined
        ? { projectId, mode: getMode(url), pagePath: url.pathname }
        : { projectId, mode: getMode(url), pageId };
    }
  }

  const [projectDomain, ...rest] = requestHost.split(".");
  const baseHost = rest.join(".");
  if (baseHost === buildHost) {
    return pageId === undefined
      ? { projectDomain, mode: getMode(url), pagePath: url.pathname }
      : { projectDomain, mode: getMode(url), pageId };
  }
};

export const preserveSearchBuildParams = (
  source: URLSearchParams,
  target: URLSearchParams
): void => {
  const mode = source.get("mode");
  if (typeof mode === "string" && modes.includes(mode as BuildMode)) {
    target.set("mode", mode);
  }

  const projectId = source.get("projectId");
  if (projectId) {
    target.set("projectId", projectId);
  }
};
