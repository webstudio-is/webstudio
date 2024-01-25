import { matchRoutes } from "@remix-run/router";
import { type PageRedirect } from "@webstudio-is/sdk";

export const matchPathFromRedirects = (
  url: string,
  redirects: Array<PageRedirect>
) => {
  const redirectMap: Record<string, string> = {};
  const routePaths: Array<{ path: string }> = [];

  for (const redirect of redirects) {
    redirectMap[redirect.old] = redirect.new;
    routePaths.push({ path: redirect.old });
  }

  const matchedRoutes = matchRoutes(routePaths, new URL(url));

  if (matchedRoutes === null) {
    return;
  }

  const redirectPath = matchedRoutes[0].route.path;
  if (redirectPath === undefined) {
    return;
  }

  return redirectMap[redirectPath];
};
