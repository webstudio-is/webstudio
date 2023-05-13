import type { ComponentProps } from "react";
import { useLoaderData, useRouteError } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { Dashboard } from "~/dashboard";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { sentryException } from "~/shared/sentry";
import { ErrorMessage } from "~/shared/error";
import { createContext } from "~/shared/context.server";

export const loader = async ({
  request,
}: LoaderArgs): Promise<ComponentProps<typeof Dashboard>> => {
  const user = await findAuthenticatedUser(request);

  if (user === null) {
    const url = new URL(request.url);
    throw redirect(
      loginPath({
        returnTo: url.pathname,
      })
    );
  }

  const context = await createContext(request);

  const projects = await dashboardProjectRouter
    // @todo pass authorization context
    .createCaller(context)
    .findMany({ userId: user.id });

  return { user, projects };
};

export const ErrorBoundary = () => {
  const error = useRouteError();
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const DashboardRoute = () => {
  const data = useLoaderData<ReturnType<typeof loader>>();
  return <Dashboard {...data} />;
};

export default DashboardRoute;
