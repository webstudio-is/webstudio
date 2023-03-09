import { redirect, json, LoaderArgs, LinksFunction } from "@remix-run/node";
import type { MetaFunction, ErrorBoundaryComponent } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root, getComponent } from "@webstudio-is/react-sdk";
import { loadCanvasData, loadProductionCanvasData } from "~/shared/db";
import env, { type PublicEnv } from "~/env/env.public.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";
import {
  type BuildMode,
  getBuildParams,
  dashboardPath,
} from "~/shared/router-utils";
import { db } from "@webstudio-is/project/server";
import type { CanvasData } from "@webstudio-is/project";
import { customComponents } from "~/canvas/custom-components";
import { createContext } from "~/shared/context.server";

type Data = CanvasData & { env: PublicEnv; mode: BuildMode };

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
  const buildEnv = buildParams?.mode === "published" ? "prod" : "dev";

  const context = await createContext(request, buildEnv);

  if (buildParams === undefined) {
    throw redirect(dashboardPath());
  }

  const project = await db.project.loadByParams(buildParams, context);

  if (project === null) {
    throw json("Project not found", { status: 404 });
  }

  const { mode } = buildParams;

  const params: CanvasData["params"] = {};

  if (env.RESIZE_ORIGIN != null) {
    params.resizeOrigin = env.RESIZE_ORIGIN;
  }

  if (buildEnv === "dev") {
    const canvasData = await loadCanvasData(
      {
        project,
        env: buildEnv,
        pageIdOrPath:
          "pageId" in buildParams ? buildParams.pageId : buildParams.pagePath,
      },
      context
    );

    if (canvasData === undefined) {
      throw json("Page not found", { status: 404 });
    }

    return { ...canvasData, env, mode, params };
  }

  // For "prod" builds we emulate the published site behaviour, reusing the same data production site uses.
  // https://github.com/webstudio-is/webstudio-builder/issues/929
  // The code below only used on localhost "publish".
  const pagesCanvasData = await loadProductionCanvasData(
    { projectId: project.id },
    context
  );

  if (!("pagePath" in buildParams)) {
    throw json("pagePath must exists in buildParams in production mode", {
      status: 404,
    });
  }

  const pagePath = buildParams.pagePath === "/" ? "" : buildParams.pagePath;

  const page = pagesCanvasData.pages.find((page) => page.path === pagePath);

  if (page === undefined) {
    throw json("Page not found", {
      status: 404,
    });
  }

  return { ...pagesCanvasData, page, env, mode, params };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const Outlet = () => {
  const data = useLoaderData<Data>();

  if (data.mode === "edit") {
    return <Canvas data={data} getComponent={getComponent} />;
  }

  return (
    <InstanceRoot
      data={data}
      getComponent={getComponent}
      customComponents={customComponents}
    />
  );
};

const Content = () => {
  // @todo This is non-standard for Remix, is there a better way?
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
