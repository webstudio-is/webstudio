import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { loadCanvasData, type CanvasData } from "~/shared/db";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { sentryException } from "~/shared/sentry";

type Data = CanvasData | { errors: string };

export const meta: MetaFunction = ({ data }: { data: Data }) => {
  if ("errors" in data) {
    return { title: "Error" };
  }
  const { page } = data;
  return { title: page.title, ...page.meta };
};

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<Data> => {
  try {
    if (params.projectId === undefined) {
      throw new Error("Missing projectId");
    }

    const url = new URL(request.url);
    const pageIdParam = url.searchParams.get("pageId");

    return loadCanvasData(params.projectId, pageIdParam || undefined);
  } catch (error) {
    sentryException({ error });
    return { errors: error instanceof Error ? error.message : String(error) };
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
