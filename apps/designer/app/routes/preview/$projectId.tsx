import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { Root } from "@webstudio-is/react-sdk";
import { loadPreviewData, type PreviewData, type ErrorData } from "~/shared/db";
import env, { Env } from "~/env.server";

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

const PreviewRoute = () => {
  const data = useLoaderData<PreviewData | ErrorData>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Root data={data} />;
};

export default PreviewRoute;
