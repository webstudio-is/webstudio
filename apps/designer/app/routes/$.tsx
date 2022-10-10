import { type LoaderFunction, redirect, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { loadCanvasData, type CanvasData } from "~/shared/db";
import config from "~/config";
import { db } from "@webstudio-is/project/index.server";
import env, { Env } from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";
import {
  type CanvasRouteMode,
  getCanvasRequestParams,
} from "~/shared/router-utils";

type Data =
  | (CanvasData & { env: Env; mode: CanvasRouteMode })
  | { errors: string; env: Env };

export const meta: MetaFunction = ({ data }: { data: Data }) => {
  if ("errors" in data) {
    return { title: "Error" };
  }
  const { page } = data;
  return { title: page.title, ...page.meta };
};

export const loader: LoaderFunction = async ({
  request,
}): Promise<Data | Response> => {
  try {
    const canvasRequest = getCanvasRequestParams(request);

    if (canvasRequest === undefined) {
      return redirect(config.dashboardPath);
    }

    const { mode, pathname } = canvasRequest;

    const project =
      "projectId" in canvasRequest
        ? await db.project.loadById(canvasRequest.projectId)
        : await db.project.loadByDomain(canvasRequest.projectDomain);

    if (project === null) {
      throw new Error("Project not found");
    }

    const canvasData = await loadCanvasData(
      project.id,
      mode === "published" ? "prod" : "dev",
      pathname
    );

    return { ...canvasData, env, mode };
  } catch (error) {
    sentryException({ error });
    return {
      errors: error instanceof Error ? error.message : String(error),
      env,
    };
  }
};

const Content = () => {
  const data = useLoaderData<Data>();

  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }

  const Outlet =
    data.mode === "edit"
      ? () => <Canvas data={data} />
      : () => <InstanceRoot data={data} />;

  // @todo This is non-standard for Remix, is there a better way?
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
