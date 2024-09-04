import {
  type HeadersFunction,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";

import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { ErrorMessage } from "~/shared/error/error-message";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);

  // No data to protect with CSRF token

  const url = new URL(request.url);

  // Redirecting asset files (e.g., .js, .css) to the dashboard should be avoided.
  // This is because immutable caching rules apply to redirects, causing these files
  // to become permanently inaccessible. Ensure asset files are served correctly
  // without redirects to maintain availability and proper caching behavior.
  const publicPaths = ["/cgi/", "/assets/", "/apple-touch-icon-"];

  // In case of 404 on static assets, this route will be executed
  if (publicPaths.some((publicPath) => url.pathname.startsWith(publicPath))) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  const contentType = request.headers.get("Content-Type");

  if (contentType?.includes("application/json")) {
    // Return an error to not trigger the ErrorBoundary rendering (api request)
    return new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // Throw an error to trigger the ErrorBoundary rendering
  throw new Response(null, {
    status: 404,
    statusText: "Not Found",
  });
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

export const ErrorBoundary = () => {
  const error = useRouteError();
  console.error({ error });
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText} ${error.data.message ?? error.data}`
    : error instanceof Error
      ? error.message
      : String(error);

  return <ErrorMessage message={`${message}`} />;
};
