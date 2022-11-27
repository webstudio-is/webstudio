import type {
  MetaFunction,
  LoaderArgs,
  ErrorBoundaryComponent,
} from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { loadCanvasData } from "~/shared/db";
import env from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";
import { getBuildParams, dashboardPath } from "~/shared/router-utils";
import { db } from "@webstudio-is/project/server";
import type { DynamicLinksFunction } from "remix-utils";
import type { CanvasData } from "@webstudio-is/project";

export const dynamicLinks: DynamicLinksFunction<CanvasData> = ({
  data,
  location,
}) => {
  const searchParams = new URLSearchParams(location.search);
  searchParams.set("pageId", data.page.id);
  return [
    {
      rel: "stylesheet",
      href: `/s/css/?${searchParams}`,
      "data-webstudio": "ssr",
    },
  ];
};

export const handle = { dynamicLinks };

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const { page } = data;
  return { title: page.title, ...page.meta };
};

export const loader = async ({ request }: LoaderArgs) => {
  const buildParams = getBuildParams(request);

  if (buildParams === undefined) {
    throw redirect(dashboardPath());
  }

  const { mode, pathname } = buildParams;

  const project = await db.project.loadByParams(buildParams);

  if (project === null) {
    throw json("Project not found", { status: 404 });
  }

  const canvasData = await loadCanvasData(
    project,
    mode === "published" ? "prod" : "dev",
    pathname
  );

  if (canvasData === undefined) {
    throw json("Page not found", { status: 404 });
  }

  const params: CanvasData["params"] = {};

  if (env.RESIZE_ORIGIN != null) {
    params.resizeOrigin = env.RESIZE_ORIGIN;
  }

  return { ...canvasData, env, mode, params };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const Content = () => {
  const data = useLoaderData<typeof loader>();

  const Outlet =
    data.mode === "edit"
      ? () => <Canvas data={data} />
      : () => <InstanceRoot data={data} />;

  // @todo This is non-standard for Remix, is there a better way?
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
