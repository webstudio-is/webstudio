import { isBuilderUrl } from "./origins";

export const isBuilder = (request: Request): boolean => {
  return isBuilderUrl(request.url) && false === isCanvas(request);
};

export const isCanvas = (request: Request): boolean => {
  const url = new URL(request.url);
  if (isBuilderUrl(url.origin) && url.pathname === "/canvas") {
    return true;
  }

  return false;
};

export const isDashboard = (request: Request): boolean => {
  if (isBuilder(request) || isCanvas(request)) {
    return false;
  }
  return true;
};

export const comparePathnames = (
  pathnameOrUrlA: string,
  pathnameOrUrlB: string
) => {
  const aPathname = new URL(pathnameOrUrlA, "http://localhost").pathname;
  const bPathname = new URL(pathnameOrUrlB, "http://localhost").pathname;
  return aPathname === bPathname;
};

export const compareUrls = (urlA: string, urlB: string) => {
  const aPathname = new URL(urlA, "http://localhost").href;
  const bPathname = new URL(urlB, "http://localhost").href;
  return aPathname === bPathname;
};
