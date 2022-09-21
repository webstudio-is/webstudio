import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Canvas } from "~/canvas";
import { loadCanvasData, type CanvasData } from "~/shared/db";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { Root } from "@webstudio-is/react-sdk";

type Data = CanvasData | { errors: string };

export const meta: MetaFunction = ({ data }: { data: Data }) => {
  if ("errors" in data) {
    return { title: "Error" };
  }
  const { page } = data;
  return { title: page.title, ...page.meta };
};

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
  return <Canvas data={data} />;
};

const CanvasRoute = () => {
  const data = useLoaderData<Data>();
  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }
  return <Root Outlet={Outlet} />;
};

export default CanvasRoute;
