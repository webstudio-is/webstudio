import { lazy } from "react";
import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";
import {
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

const Canvas = lazy(async () => {
  const { Canvas } = await import("~/canvas/index.client");
  return { default: Canvas };
});

const CanvasRoute = () => {
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

export default CanvasRoute;

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30,
};
