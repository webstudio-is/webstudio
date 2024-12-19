import { lazy } from "react";
import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { isCanvas } from "~/shared/router-utils";
import { ClientOnly } from "~/shared/client-only";
import { Body } from "~/canvas/shared/body";

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
    <ClientOnly fallback={<Body />}>
      <Canvas />
    </ClientOnly>
  );
};

export default CanvasRoute;

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30,
};
