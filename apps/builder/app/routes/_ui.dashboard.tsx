import { lazy } from "react";
import { preconnect, prefetchDNS } from "react-dom";
import {
  Outlet,
  redirect,
  type ShouldRevalidateFunction,
} from "react-router-dom";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import {
  createCallerFactory,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { db } from "@webstudio-is/project/index.server";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { builderUrl, isDashboard, loginPath } from "~/shared/router-utils";
import env from "~/env/env.server";
import { ClientOnly } from "~/shared/client-only";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { allowedDestinations } from "~/services/destinations.server";
export { ErrorBoundary } from "~/shared/error/error-boundary";
import { findAuthenticatedUser } from "~/services/auth.server";
import { createContext } from "~/shared/context.server";

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

const dashboardProjectCaller = createCallerFactory(dashboardProjectRouter);

const loadDashboardData = async (request: Request) => {
  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const user = await findAuthenticatedUser(request);

  const url = new URL(request.url);

  if (user === null) {
    throw redirect(
      loginPath({
        returnTo: `${url.pathname}${url.search}`,
      })
    );
  }

  const context = await createContext(request);

  if (context.authorization.type !== "user") {
    throw new AuthorizationError("You must be logged in to access this page");
  }

  const { userPlanFeatures } = context;

  if (userPlanFeatures === undefined) {
    throw new Response("User plan features are not defined", {
      status: 404,
    });
  }

  const { sourceOrigin } = parseBuilderUrl(request.url);

  const projects = await dashboardProjectCaller(context).findMany({
    userId: user.id,
  });

  const templates = await dashboardProjectCaller(context).findManyByIds({
    projectIds: env.PROJECT_TEMPLATES,
  });

  return {
    context,
    user,
    origin: sourceOrigin,
    userPlanFeatures,
    projects,
    templates,
  };
};

const getProjectToClone = async (request: Request, context: AppContext) => {
  const url = new URL(request.url);
  const projectToCloneAuthToken = url.searchParams.get(
    "projectToCloneAuthToken"
  );

  if (
    // Only on navigation requests
    request.headers.get("sec-fetch-mode") !== "navigate" ||
    projectToCloneAuthToken === null
  ) {
    return;
  }

  // Clone project
  const token = await authDb.getTokenInfo(projectToCloneAuthToken, context);
  if (token.canClone === false) {
    throw new AuthorizationError("You don't have access to clone this project");
  }

  const project = await db.project.loadById(
    token.projectId,
    await context.createTokenContext(projectToCloneAuthToken)
  );

  return {
    id: token.projectId,
    authToken: projectToCloneAuthToken,
    title: project.title,
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);

  const { context, user, userPlanFeatures, origin, projects, templates } =
    await loadDashboardData(request);

  const projectToClone = await getProjectToClone(request, context);

  return {
    user,
    projects,
    templates,
    userPlanFeatures,
    publisherHost: env.PUBLISHER_HOST,
    origin,
    projectToClone,
  };
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  defaultShouldRevalidate,
  currentUrl,
  nextUrl,
}) => {
  // We have the entire data on the client, so we don't need to revalidate when
  // URL is changing.
  if (currentUrl.href !== nextUrl.href) {
    return false;
  }
  // When .revalidate() was called explicitely without chaning the URL,
  // `defaultShouldRevalidate` will be true
  return defaultShouldRevalidate;
};

const DashboardSetup = lazy(async () => {
  const { DashboardSetup } = await import("~/dashboard/index.client");
  return { default: DashboardSetup };
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
      <DashboardSetup data={data} />
      <Outlet />
    </ClientOnly>
  );
};

export default DashboardRoute;
