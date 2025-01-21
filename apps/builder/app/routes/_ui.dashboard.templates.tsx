import { lazy } from "react";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import env from "~/env/env.server";
import { ClientOnly } from "~/shared/client-only";
import { createCallerFactory } from "@webstudio-is/trpc-interface/index.server";
import {
  getProjectToClone,
  loadDashboardData,
} from "~/shared/router-utils/dashboard";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { allowedDestinations } from "~/services/destinations.server";
export { ErrorBoundary } from "~/shared/error/error-boundary";

const dashboardProjectCaller = createCallerFactory(dashboardProjectRouter);

export const meta = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Dashboard | Starter templates" });

  return metas;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);

  const { context, user, userPlanFeatures, origin } =
    await loadDashboardData(request);
  const projectToClone = await getProjectToClone(request, context);
  const templates = await dashboardProjectCaller(context).findManyByIds({
    projectIds: env.PROJECT_TEMPLATES,
  });
  const hasProjects = await dashboardProjectCaller(context).hasAny({
    userId: user.id,
  });

  return {
    user,
    templates,
    welcome: hasProjects === false,
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

  return (
    <ClientOnly>
      <Dashboard {...data} />
    </ClientOnly>
  );
};

export default DashboardRoute;
