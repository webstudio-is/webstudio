import {
  type HeadersFunction,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
export { ErrorBoundary } from "~/shared/error/error-boundary";

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
    throw new Response("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  const contentType = request.headers.get("Content-Type");

  if (contentType?.includes("application/json")) {
    // Return an error to not trigger the ErrorBoundary rendering (api request)
    throw new Response("Not found", {
      status: 404,
    });
  }

  // Throw an error to trigger the ErrorBoundary rendering
  throw new Response("Not found", {
    status: 404,
  });
};

export default function NotFound() {
  // Placeholder component to prevent Remix warning:
  // "Matched leaf route at location '/{SOME_LOCATION}' does not have an element or Component."
  // Without this, an <Outlet /> with a null value would render an empty page.
  return (
    <div>
      <h1>Not Found</h1>
      <p>The page you requested could not be found.</p>
    </div>
  );
}

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
