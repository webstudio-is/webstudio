import { lazy } from "react";
import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import { isCanvas } from "~/shared/router-utils";
import { ClientOnly } from "~/shared/client-only";

export { ErrorBoundary } from "~/shared/error/error-boundary";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isCanvas(request) === false) {
    throw new Response("Not Found", {
      status: 404,
    });
  }
  return {};
};

const Canvas = lazy(async () => {
  const { Canvas } = await import("~/canvas/index.client");
  return { default: Canvas };
});

const CanvasRoute = () => {
  return (
    // this setup remix scripts on canvas and after rendering a website
    // scripts will continue to work even though removed from dom
    <ClientOnly
      fallback={
        <body>
          <Scripts />
          <ScrollRestoration />
        </body>
      }
    >
      <Canvas />
    </ClientOnly>
  );
};

export default CanvasRoute;
