import { lazy } from "react";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { builderUrl, templatesPath } from "~/shared/router-utils";
import env from "~/env/env.server";
import { ClientOnly } from "~/shared/client-only";
import { createCallerFactory } from "@webstudio-is/trpc-interface/index.server";
import { preconnect, prefetchDNS } from "react-dom";
import {
  getProjectToClone,
  loadDashboardData,
} from "~/shared/router-utils/dashboard";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { allowedDestinations } from "~/services/destinations.server";
import { redirect } from "react-router-dom";
export { ErrorBoundary } from "~/shared/error/error-boundary";

const dashboardProjectCaller = createCallerFactory(dashboardProjectRouter);

export const meta = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Dashboard | Projects" });

  return metas;
};

/**
 * When deleting/adding a project, then navigating to a new project and pressing the back button,
 * the dashboard page may display stale data because it’s being retrieved from the browser’s back/forward cache (bfcache).
 *
 * https://web.dev/articles/bfcache
 *
 */
export const headers = () => {
  return {
    "Cache-Control": "no-store",
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);

  const { context, user, userPlanFeatures, origin } =
    await loadDashboardData(request);
  const projects = await dashboardProjectCaller(context).findMany({
    userId: user.id,
  });

  if (projects.length === 0) {
    throw redirect(templatesPath());
  }

  const projectToClone = await getProjectToClone(request, context);

  return {
    user,
    projects,
    welcome: false,
    userPlanFeatures,
    publisherHost: env.PUBLISHER_HOST,
    origin,
    projectToClone,
  };
};

const Dashboard = lazy(async () => {
  const { Dashboard } = await import("~/dashboard/index.client");
  return { default: Dashboard };
});

const DashboardRoute = () => {
  const data = useLoaderData<typeof loader>();

  data.projects.slice(0, 5).forEach((project) => {
    prefetchDNS(builderUrl({ projectId: project.id, origin: data.origin }));
  });
  data.projects.slice(0, 5).forEach((project) => {
    preconnect(builderUrl({ projectId: project.id, origin: data.origin }));
  });

  return (
    <ClientOnly>
      <Dashboard {...data} page="projects" />
    </ClientOnly>
  );
};

export default DashboardRoute;
