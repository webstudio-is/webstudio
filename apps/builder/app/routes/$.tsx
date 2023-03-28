import { redirect } from "@remix-run/node";
import type { LoaderArgs, ErrorBoundaryComponent } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Root, getComponent } from "@webstudio-is/react-sdk";
import env from "~/env/env.public.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";
import { getBuildParams, dashboardPath } from "~/shared/router-utils";
import type { CanvasData } from "@webstudio-is/project";

export const loader = async ({ request }: LoaderArgs) => {
  const buildParams = getBuildParams(request);
  if (buildParams === undefined) {
    throw redirect(dashboardPath());
  }

  const params: CanvasData["params"] = {};

  if (env.RESIZE_ORIGIN != null) {
    params.resizeOrigin = env.RESIZE_ORIGIN;
  }

  return { params };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const Outlet = () => {
  const { params } = useLoaderData<typeof loader>();
  return <Canvas params={params} getComponent={getComponent} />;
};

/**
 * @todo add support for published site on localhost
 * consider switching current route to something like /canvas
 */

const Content = () => {
  // @todo This is non-standard for Remix, is there a better way?
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
