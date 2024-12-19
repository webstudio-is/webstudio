import { lazy } from "react";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { findAuthenticatedUser } from "~/services/auth.server";
import { builderUrl, isDashboard, loginPath } from "~/shared/router-utils";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";
import { ClientOnly } from "~/shared/client-only";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import {
  AuthorizationError,
  createCallerFactory,
} from "@webstudio-is/trpc-interface/index.server";
import { redirect } from "~/services/no-store-redirect";
import { preconnect, prefetchDNS } from "react-dom";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { allowedDestinations } from "~/services/destinations.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { db } from "@webstudio-is/project/index.server";
export { ErrorBoundary } from "~/shared/error/error-boundary";

const dashboardProjectCaller = createCallerFactory(dashboardProjectRouter);

export const meta: MetaFunction<typeof loader> = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Dashboard" });

  return metas;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.

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

  const projectToCloneAuthToken = url.searchParams.get(
    "projectToCloneAuthToken"
  );

  let projectToClone:
    | { id: string; title: string; authToken: string }
    | undefined = undefined;

  if (
    // Only on navigation requests
    request.headers.get("sec-fetch-mode") === "navigate" &&
    projectToCloneAuthToken !== null
  ) {
    // Clone project
    const token = await authDb.getTokenInfo(projectToCloneAuthToken, context);
    if (token.canClone === false) {
      throw new AuthorizationError(
        "You don't have access to clone this project"
      );
    }

    const project = await db.project.loadById(
      token.projectId,
      await context.createTokenContext(projectToCloneAuthToken)
    );

    projectToClone = {
      id: token.projectId,
      authToken: projectToCloneAuthToken,
      title: project.title,
    };
  }

  const projects = await dashboardProjectCaller(context).findMany({
    userId: user.id,
  });

  const projectTemplates = await dashboardProjectCaller(context).findManyByIds({
    projectIds: env.PROJECT_TEMPLATES,
  });

  const { userPlanFeatures } = context;

  if (userPlanFeatures === undefined) {
    throw new Response("User plan features are not defined", {
      status: 404,
    });
  }

  const { sourceOrigin } = parseBuilderUrl(request.url);

  return json({
    user,
    projects,
    projectTemplates,
    userPlanFeatures,
    publisherHost: env.PUBLISHER_HOST,
    origin: sourceOrigin,
    projectToClone,
  });
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
      <Dashboard {...data} />
    </ClientOnly>
  );
};

export default DashboardRoute;
