export type CanvasRouteMode = "edit" | "preview" | "published";
const modes = ["edit", "preview", "published"] as CanvasRouteMode[];
const getMode = (url: URL): CanvasRouteMode => {
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

export const getUserContentHost = (request: MinimalRequest): string => {
  const { USER_CONTENT_HOST } = process.env;
  if (USER_CONTENT_HOST !== undefined && USER_CONTENT_HOST !== "") {
    return USER_CONTENT_HOST;
  }

  // Local development special case
  const host = getRequestHost(request);
  if (
    process.env.NODE_ENV === "development" &&
    /^(.*\.)?localhost(:\d+)?$/.test(host)
  ) {
    return host.split(".").pop() as string;
  }

  // Vercel preview special case
  if (
    (process.env.VERCEL_ENV === "preview" ||
      process.env.VERCEL_ENV === "development") &&
    typeof process.env.VERCEL_URL === "string"
  ) {
    return process.env.VERCEL_URL;
  }

  throw new Error("Could not determine user content host");
};

export const getUserContentParams = (
  request: MinimalRequest
):
  | {
      projectId: string;
      mode: CanvasRouteMode;
      pathname: string;
    }
  | {
      projectDomain: string;
      mode: CanvasRouteMode;
      pathname: string;
    }
  | undefined => {
  const url = new URL(request.url);

  const requestHost = getRequestHost(request);
  const userContentHost = getUserContentHost(request);

  if (process.env.USER_CONTENT_REQUIRE_SUBDOMAIN !== "true") {
    const projectId = url.searchParams.get("projectId");
    if (projectId !== null && userContentHost === requestHost) {
      return {
        projectId,
        mode: getMode(url),
        pathname: url.pathname,
      };
    }
  }

  const [projectDomain, ...rest] = requestHost.split(".");
  const baseHost = rest.join(".");
  if (baseHost === userContentHost) {
    return {
      projectDomain,
      mode: getMode(url),
      pathname: url.pathname,
    };
  }

  return;
};
