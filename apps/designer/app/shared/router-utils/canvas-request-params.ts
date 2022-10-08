import config from "~/config";

export type CanvasRouteMode = "edit" | "preview" | "published";

const modes = ["edit", "preview", "published"] as CanvasRouteMode[];

export const getCanvasRequestParams = (request: {
  url: string;
  headers: { get: (name: string) => string | null };
}):
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

  const pathname = url.pathname;

  if (Object.values(config).some((path) => pathname.startsWith(path))) {
    return undefined;
  }

  let projectDomain = undefined;
  let projectId = undefined;

  const projectIdParam = url.searchParams.get("projectId");
  if (projectIdParam !== null) {
    projectId = projectIdParam;
  }

  if (projectId === undefined) {
    // @todo all this subdomain logic is very hacky
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const [userDomain, wstdDomain] = host.split(".");
    if (wstdDomain === "wstd" || wstdDomain?.includes("localhost")) {
      projectDomain = userDomain;
    }
  }

  const modeParam = url.searchParams.get("mode");
  const mode =
    modeParam === null ? "published" : modes.find((mode) => mode === modeParam);
  if (mode === undefined) {
    throw new Error(`Invalid mode "${modeParam}"`);
  }

  if (projectId !== undefined) {
    return {
      projectId,
      mode,
      pathname,
    };
  }

  if (projectDomain !== undefined) {
    return {
      projectDomain,
      mode,
      pathname,
    };
  }

  return undefined;
};
