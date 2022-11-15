// These are the utils for manipulating "build" params.
// "Build" means user generated content — what user builds.

export type BuildMode = "edit" | "preview" | "published";
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

// A subtype of Request. To make testing easier.
type MinimalRequest = {
  url: string;
  headers: { get: (name: string) => string | null };
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
  if (env.NODE_ENV === "development" && isLocalhost(host)) {
    return `http://${host.split(".").pop()}`;
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
):
  | {
      projectId: string;
      mode: BuildMode;
      pathname: string;
      pageId?: string;
    }
  | {
      projectDomain: string;
      mode: BuildMode;
      pathname: string;
      pageId?: string;
    }
  | undefined => {
  const url = new URL(request.url);

  const requestHost = getRequestHost(request);
  const buildHost = new URL(getBuildOrigin(request, env)).host;
  const pageId = url.searchParams.get("pageId") ?? undefined;

  if (env.BUILD_REQUIRE_SUBDOMAIN !== "true") {
    const projectId = url.searchParams.get("projectId");
    if (projectId !== null && buildHost === requestHost) {
      return {
        projectId,
        mode: getMode(url),
        pathname: url.pathname,
        pageId,
      };
    }
  }

  const [projectDomain, ...rest] = requestHost.split(".");
  const baseHost = rest.join(".");
  if (baseHost === buildHost) {
    return {
      projectDomain,
      mode: getMode(url),
      pathname: url.pathname,
      pageId,
    };
  }
};
