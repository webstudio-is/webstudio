import { redirect } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import {
  Links,
  Meta,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import type { Params } from "@webstudio-is/react-sdk";
import env from "~/env/env.public.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";
import { dashboardPath, isCanvas } from "~/shared/router-utils";
import { createImageLoader } from "@webstudio-is/image";

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url);
  // See remix.config.ts for the publicPath value
  const publicPath = "/build/";

  // In case of 404 on static assets, this route will be executed
  if (url.pathname.startsWith(publicPath)) {
    throw new Response("Not found", {
      status: 404,
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

  sentryException({ error });
  const message = isRouteErrorResponse(error)
    ? error.data.message ?? error.data
    : error instanceof Error
    ? error.message
    : String(error);

  return <ErrorMessage message={message} />;
};

/**
 * @todo add support for published project on localhost
 * consider switching current route to something like /canvas
 */

const Content = () => {
  const { params } = useLoaderData<typeof loader>();
  const imageLoader = createImageLoader({
    imageBaseUrl: params.imageBaseUrl,
  });
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>

      <Canvas params={params} imageLoader={imageLoader} />
    </html>
  );
};

export default Content;
