import { lazy } from "react";
import { useLoaderData, useRouteError } from "@remix-run/react";
import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { ErrorMessage } from "~/shared/error";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";
import type { DashboardProps } from "~/dashboard/dashboard";
import { ClientOnly } from "~/shared/client-only";

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<DashboardProps> => {
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

  const projectTemplates = await dashboardProjectRouter
    .createCaller(context)
    .findManyByIds({ projectIds: env.PROJECT_TEMPLATES });

  const { userPlanFeatures } = context;

  if (userPlanFeatures === undefined) {
    throw new Error("User plan features are not defined");
  }

  return {
    user,
    projects,
    projectTemplates,
    userPlanFeatures,
    publisherHost: env.PUBLISHER_HOST,
    imageBaseUrl: env.IMAGE_BASE_URL,
  };
};

export const ErrorBoundary = () => {
  const error = useRouteError();
  console.error({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const Dashboard = lazy(async () => {
  const { Dashboard } = await import("~/dashboard/index.client");
  return { default: Dashboard };
});

const DashboardRoute = () => {
  const data = useLoaderData<DashboardProps>();

  return (
    <ClientOnly>
      <Dashboard {...data} />
    </ClientOnly>
  );
};

export default DashboardRoute;
