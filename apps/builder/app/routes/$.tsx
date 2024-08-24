import {
  type HeadersFunction,
  type LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";

import { dashboardPath } from "~/shared/router-utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Redirecting asset files (e.g., .js, .css) to the dashboard should be avoided.
  // This is because immutable caching rules apply to redirects, causing these files
  // to become permanently inaccessible. Ensure asset files are served correctly
  // without redirects to maintain availability and proper caching behavior.
  const publicPaths = ["/cgi/", "/assets/"];

  // In case of 404 on static assets, this route will be executed
  if (publicPaths.some((publicPath) => url.pathname.startsWith(publicPath))) {
    throw new Response("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  return redirect(dashboardPath());
};

export const headers: HeadersFunction = ({ errorHeaders, loaderHeaders }) => {
  // !!!! VERY IMPORTANT !!!
  // Vercel sets Cache-Control: public, max-age=31536000, immutable for all /assets/* paths,
  // even when a 404 error occurs during deployment.
  // This causes 404 errors on assets to be cached permanently, preventing updates.
  // To prevent this, we set "Cache-Control": "public, max-age=0, must-revalidate" when an asset is not found.
  const cacheControl = errorHeaders?.get("Cache-Control");

  if (cacheControl) {
    return {
      "Cache-Control": cacheControl,
    };
  }
  return loaderHeaders;
};
