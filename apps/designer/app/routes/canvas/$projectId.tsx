import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Canvas } from "~/canvas";
import { loadCanvasData, type ErrorData, type CanvasData } from "~/shared/db";
import env, { Env } from "~/env.server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { Canvas as CanvasDocument } from "@webstudio-is/react-sdk";

type Data = (CanvasData | ErrorData) & { env: Env };

export const meta: MetaFunction = () => {
  return { title: "Webstudio canvas" };
};

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

const Outlet = () => {
  const data = useLoaderData<CanvasData>();
  return <Canvas data={data} />;
};

const CanvasRoute = () => {
  const data = useLoaderData<Data>();
  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }
  return <CanvasDocument Outlet={Outlet} />;
};

export default CanvasRoute;
