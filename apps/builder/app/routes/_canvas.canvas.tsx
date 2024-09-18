import { lazy } from "react";
import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import type { Params } from "@webstudio-is/react-sdk";
import { Body } from "@webstudio-is/sdk-components-react-remix";
import { createImageLoader } from "@webstudio-is/image";
import env from "~/env/env.server";
import { isCanvas } from "~/shared/router-utils";
import { ClientOnly } from "~/shared/client-only";
export { ErrorBoundary } from "~/shared/error/error-boundary";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isCanvas(request) === false) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const params: Params = {
    imageBaseUrl: env.IMAGE_BASE_URL,
    assetBaseUrl: env.ASSET_BASE_URL,
  };

  return { params };
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
