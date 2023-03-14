import { redirect, json, LoaderArgs, LinksFunction } from "@remix-run/node";
import type { MetaFunction, ErrorBoundaryComponent } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Root, getComponent } from "@webstudio-is/react-sdk";
import { loadCanvasData } from "~/shared/db";
import env, { type PublicEnv } from "~/env/env.public.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";
import { getBuildParams, dashboardPath } from "~/shared/router-utils";
import { db } from "@webstudio-is/project/server";
import type { CanvasData } from "@webstudio-is/project";
import { createContext } from "~/shared/context.server";

type Data = CanvasData & { env: PublicEnv };

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: `/s/css`,
      "data-webstudio": "ssr",
    },
  ];
};

export const meta: MetaFunction = ({ data }: { data: Data }) => {
  const { page } = data;
  return { title: page.title, ...page.meta };
};

export const loader = async ({ request }: LoaderArgs): Promise<Data> => {
  const buildParams = getBuildParams(request);

  const context = await createContext(request, "dev");

  if (buildParams === undefined) {
    throw redirect(dashboardPath());
  }

  const project = await db.project.loadByParams(buildParams, context);

  if (project === null) {
    throw json("Project not found", { status: 404 });
  }

  const params: CanvasData["params"] = {};

  if (env.RESIZE_ORIGIN != null) {
    params.resizeOrigin = env.RESIZE_ORIGIN;
  }

  const canvasData = await loadCanvasData(
    {
      project,
      env: "dev",
      pageIdOrPath:
        "pageId" in buildParams ? buildParams.pageId : buildParams.pagePath,
    },
    context
  );

  if (canvasData === undefined) {
    throw json("Page not found", { status: 404 });
  }

  return { ...canvasData, env, params };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const Outlet = () => {
  const data = useLoaderData<Data>();
  return <Canvas data={data} getComponent={getComponent} />;
};

const Content = () => {
  // @todo This is non-standard for Remix, is there a better way?
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
