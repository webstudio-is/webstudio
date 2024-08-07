import { lazy } from "react";
import {
  type LoaderFunctionArgs,
  redirect,
  type HeadersFunction,
} from "@remix-run/server-runtime";
import {
  Links,
  Meta,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import type { Params } from "@webstudio-is/react-sdk";
import { Body } from "@webstudio-is/sdk-components-react-remix";
import { createImageLoader } from "@webstudio-is/image";
import env from "~/env/env.server";
import { ErrorMessage } from "~/shared/error";
import { dashboardPath, isCanvas } from "~/shared/router-utils";
import { ClientOnly } from "~/shared/client-only";

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

  if (isCanvas(request) === false) {
    throw redirect(dashboardPath());
  }

  const params: Params = {
    imageBaseUrl: env.IMAGE_BASE_URL,
    assetBaseUrl: env.ASSET_BASE_URL,
  };

  return { params };
};

export const ErrorBoundary = () => {
  const error = useRouteError();

  console.error({ error });
  const message = isRouteErrorResponse(error)
    ? (error.data.message ?? error.data)
    : error instanceof Error
      ? error.message
      : String(error);

  return <ErrorMessage message={message} />;
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

const Canvas = lazy(async () => {
  const { Canvas } = await import("~/canvas/index.client");
  return { default: Canvas };
});

const Outlet = () => {
  const { params } = useLoaderData<typeof loader>();
  const imageLoader = createImageLoader({
    imageBaseUrl: params.imageBaseUrl,
  });
  return (
    <ClientOnly fallback={<Body />}>
      <Canvas params={params} imageLoader={imageLoader} />
    </ClientOnly>
  );
};

/**
 * @todo add support for published project on localhost
 * consider switching current route to something like /canvas
 */

const Content = () => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <Outlet />
    </html>
  );
};

export default Content;

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30,
};
