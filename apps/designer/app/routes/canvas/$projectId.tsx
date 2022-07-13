import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { Canvas } from "~/canvas";
import { loadCanvasData, type ErrorData, type CanvasData } from "~/shared/db";
import env, { Env } from "~/env.server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";

type Data = (CanvasData | ErrorData) & { env: Env };

export const loader: LoaderFunction = async ({ params }): Promise<Data> => {
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
      const message = `Bad canvas data: \n ${error.message}`;
      sentryException({ message });
      return {
        errors: message,
        env,
      };
    }
  }

  return { errors: "Unexpected error", env };
};

const CanvasRoute = () => {
  const data = useLoaderData<Data>();
  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }
  return <Canvas data={data} />;
};

export default CanvasRoute;
