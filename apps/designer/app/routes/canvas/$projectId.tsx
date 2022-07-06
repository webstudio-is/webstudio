import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { Canvas } from "apps/designer/app/canvas";
import {
  loadCanvasData,
  type ErrorData,
  type CanvasData,
} from "apps/designer/app/shared/db";
import env, { Env } from "apps/designer/app/env.server";

type LoaderReturnTypes = Promise<
  (CanvasData & { env: Env }) | (ErrorData & { env: Env })
>;

export const loader: LoaderFunction = async ({ params }): LoaderReturnTypes => {
  if (params.projectId === undefined) {
    return { errors: "Missing projectId", env };
  }
  try {
    const canvasData = await loadCanvasData({ projectId: params.projectId });
    return {
      ...canvasData,
      env,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
        env,
      };
    }
  }
  return { errors: "Unexpected error", env };
};

const CanvasRoute = () => {
  const data = useLoaderData<CanvasData | ErrorData>();
  // @todo how should we treat this kind of errors?
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Canvas data={data} />;
};

export default CanvasRoute;
