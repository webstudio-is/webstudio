import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { loadCanvasData, type CanvasData } from "~/shared/db";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { sentryException } from "~/shared/sentry";

export const meta: MetaFunction = () => {
  return { title: "Webstudio site preview" };
};

type Data = CanvasData | { errors: string };

export const loader: LoaderFunction = async ({ params }): Promise<Data> => {
  try {
    if (params.projectId === undefined) {
      throw new Error("Missing projectId");
    }

    return loadCanvasData(params.projectId, params.pageId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sentryException({ message });
    return { errors: message };
  }
};

const Outlet = () => {
  const data = useLoaderData<CanvasData>();
  return <InstanceRoot data={data} />;
};

const PreviewRoute = () => {
  const data = useLoaderData<Data>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Root Outlet={Outlet} />;
};

export default PreviewRoute;
