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

  const projectId = url.searchParams.get("projectId");

  let projectDomain = undefined;
  if (projectId === null) {
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

  if (projectId !== null) {
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

  return;
};
