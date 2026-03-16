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
import * as projectApi from "@webstudio-is/project/index.server";
import { workspace as workspaceApi } from "@webstudio-is/project/index.server";
import type { WorkspaceRelation } from "@webstudio-is/project";
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
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

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

  const { userPlanFeatures, purchases } = context;

  const { sourceOrigin } = parseBuilderUrl(request.url);

  const findManyInput: { userId: string; workspaceId?: string } = {
    userId: user.id,
  };

  let workspaces: Awaited<ReturnType<typeof workspaceApi.findMany>> | undefined;
  let currentWorkspaceId: string | undefined;
  let workspaceRelation: WorkspaceRelation | "own" = "own";

  if (isFeatureEnabled("workspaces")) {
    workspaces = await workspaceApi.findMany(user.id, context);

    // Read selected workspace from URL, fall back to the default workspace
    const selectedId = url.searchParams.get("workspaceId");

    const matchedWorkspace =
      selectedId === null
        ? undefined
        : workspaces.find((w) => w.id === selectedId);

    // If the URL references a workspace that no longer exists or the user
    // lost access to, strip the stale param and redirect so the client
    // falls back to the default workspace.
    if (selectedId !== null && matchedWorkspace === undefined) {
      url.searchParams.delete("workspaceId");
      const search = url.searchParams.toString();
      throw redirect(search ? `${url.pathname}?${search}` : url.pathname);
    }

    const defaultWorkspace = workspaces.find((w) => w.isDefault);
    const currentWorkspace = matchedWorkspace ?? defaultWorkspace;
    currentWorkspaceId = currentWorkspace?.id;

    if (currentWorkspace !== undefined) {
      workspaceRelation = currentWorkspace.workspaceRelation;
    }

    if (currentWorkspaceId !== undefined) {
      findManyInput.workspaceId = currentWorkspaceId;
    }
  }

  const projects =
    await dashboardProjectCaller(context).findMany(findManyInput);

  const templates = await dashboardProjectCaller(context).findManyByIds({
    projectIds: env.PROJECT_TEMPLATES,
    skipApprovalCheck: true,
  });

  return {
    context,
    user,
    origin: sourceOrigin,
    userPlanFeatures,
    purchases,
    projects,
    templates,
    workspaces,
    currentWorkspaceId,
    workspaceRelation,
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

  const project = await projectApi.loadById(
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

  const {
    context,
    user,
    userPlanFeatures,
    purchases,
    origin,
    projects,
    templates,
    workspaces,
    currentWorkspaceId,
    workspaceRelation,
  } = await loadDashboardData(request);

  const projectToClone = await getProjectToClone(request, context);

  return {
    user,
    projects,
    templates,
    userPlanFeatures,
    purchases,
    publisherHost: env.PUBLISHER_HOST,
    origin,
    projectToClone,
    workspaces,
    currentWorkspaceId,
    workspaceRelation,
  };
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  defaultShouldRevalidate,
  currentUrl,
  nextUrl,
}) => {
  // Revalidate when workspace changes (need to re-fetch project list)
  if (
    currentUrl.searchParams.get("workspaceId") !==
    nextUrl.searchParams.get("workspaceId")
  ) {
    return true;
  }

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
