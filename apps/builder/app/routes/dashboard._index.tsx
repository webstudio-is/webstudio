import { type ComponentProps } from "react";
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
import env from "~/env/env.server";
import { loadAssetNamesByAssetIds } from "@webstudio-is/asset-uploader/index.server";

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

  const projectTemplates = await dashboardProjectRouter
    .createCaller(context)
    .findManyByIds({ projectIds: env.PROJECT_TEMPLATES });

  const allProjects = [...projects, ...projectTemplates];

  const assetNames = await loadAssetNamesByAssetIds(
    allProjects.map((project) => project.previewImageAssetId).filter(Boolean)
  );
  const assetNamesMap = new Map(
    assetNames.map((asset) => [asset.id, asset.name])
  );

  allProjects.forEach((project) => {
    // Enrich the projects with preview image names, local mutation is fine
    project.previewImageName = assetNamesMap.get(project.previewImageAssetId);
  });

  const { userPlanFeatures } = context;

  if (userPlanFeatures === undefined) {
    throw new Error("User plan features are not defined");
  }

  return {
    user,
    projects,
    projectTemplates,
    userPlanFeatures,
  };
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
