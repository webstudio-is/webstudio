import config from "~/config";

export type CanvasRouteMode = "edit" | "preview" | "published";

const modes = ["edit", "preview", "published"] as CanvasRouteMode[];

type ProjectIdentifier = { type: "id" | "domain"; value: string };

export const getCanvasRequestParams = (request: {
  url: string;
  headers: { get: (name: string) => string | null };
}):
  | {
      projectIdObject: ProjectIdentifier;
      mode: CanvasRouteMode;
      pathname: string;
    }
  | undefined => {
  const url = new URL(request.url);

  const pathname = url.pathname;

  if (Object.values(config).some((path) => pathname.startsWith(path))) {
    return undefined;
  }

  let projectIdObject: ProjectIdentifier | undefined = undefined;

  // @todo all this subdomain logic is very hacky
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const [userDomain, wstdDomain] = host.split(".");
  if (wstdDomain === "wstd" || wstdDomain?.includes("localhost")) {
    projectIdObject = { type: "domain", value: userDomain };
  }

  if (projectIdObject === undefined) {
    const projectIdParam = url.searchParams.get("projectId");
    if (projectIdParam !== null) {
      projectIdObject = { type: "id", value: projectIdParam };
    }
  }

  if (projectIdObject === undefined) {
    return undefined;
  }

  const modeParam = url.searchParams.get("mode");
  const mode =
    modeParam === null ? "published" : modes.find((mode) => mode === modeParam);
  if (mode === undefined) {
    throw new Error(`Invalid mode "${modeParam}"`);
  }

  return { projectIdObject, mode, pathname };
};
