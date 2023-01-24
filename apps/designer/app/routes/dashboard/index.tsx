import { useLoaderData } from "@remix-run/react";
import type { ErrorBoundaryComponent, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Dashboard } from "~/dashboard";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { ComponentProps } from "react";
import { prisma } from "@webstudio-is/prisma-client";
import { sentryException } from "~/shared/sentry";
import { ErrorMessage } from "~/shared/error";

export { links } from "~/dashboard";

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

  const projects = await prisma.dashboardProject.findMany({
    where: {
      userId: user.id,
      isDeleted: false,
    },
  });

  return { user, projects };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const DashboardRoute = () => {
  const data = useLoaderData<ReturnType<typeof loader>>();
  return <Dashboard {...data} />;
};

export default DashboardRoute;
