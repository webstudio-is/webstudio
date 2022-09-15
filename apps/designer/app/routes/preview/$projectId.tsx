import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Root } from "@webstudio-is/react-sdk";
import { loadPreviewData, type PreviewData, type ErrorData } from "~/shared/db";
import { Canvas as CanvasDocument } from "@webstudio-is/react-sdk";
import env, { Env } from "~/env.server";

export const meta: MetaFunction = () => {
  return { title: "Webstudio site preview" };
};

type LoaderReturnType = Promise<
  (PreviewData & { env: Env }) | (ErrorData & { env: Env })
>;

export const loader: LoaderFunction = async ({ params }): LoaderReturnType => {
  if (params.projectId === undefined) {
    return { errors: "Missing projectId", env };
  }
  try {
    const previewData = await loadPreviewData({ projectId: params.projectId });
    return {
      ...previewData,
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

const Outlet = () => {
  const data = useLoaderData<PreviewData>();
  return <Root data={data} />;
};

const PreviewRoute = () => {
  const data = useLoaderData<PreviewData | ErrorData>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <CanvasDocument Outlet={Outlet} />;
};

export default PreviewRoute;
