import { lazy, useEffect } from "react";
import { preconnect, prefetchDNS } from "react-dom";
import {
  Outlet,
  redirect,
  type ShouldRevalidateFunction,
} from "react-router-dom";
import {
  useLoaderData,
  useLocation,
  useNavigate,
  type MetaFunction,
} from "@remix-run/react";
import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import {
  createCallerFactory,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import * as projectApi from "@webstudio-is/project/index.server";
import { notification as notificationApi } from "@webstudio-is/project/index.server";
import type { Role } from "@webstudio-is/project";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { db as dashboardDb } from "@webstudio-is/dashboard/index.server";
import { builderUrl, isDashboard, loginPath } from "~/shared/router-utils";
import { getSetting, setSetting } from "~/builder/shared/client-settings";
import env from "~/env/env.server";
import { ClientOnly } from "~/shared/client-only";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { allowedDestinations } from "~/services/destinations.server";
export { ErrorBoundary } from "~/shared/error/error-boundary";
import { findAuthenticatedUser } from "~/services/auth.server";
import { createContext } from "~/shared/context.server";
import { isDowngradedForMember } from "~/dashboard/workspace/utils";
import { loadWorkspacesForDashboard } from "~/dashboard/workspace/loader.server";
import type { DashboardData } from "~/dashboard/shared/types";

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

  const { planFeatures, purchases } = context;

  const { sourceOrigin } = parseBuilderUrl(request.url);

  const findManyInput: {
    userId: string;
    workspaceId?: string;
    includeUnassigned?: boolean;
  } = {
    userId: user.id,
  };

  let role: Role | "own" = "own";

  const wsResult = await loadWorkspacesForDashboard(user.id, url, context);
  if (wsResult.type === "redirect") {
    throw redirect(wsResult.to);
  }

  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    role: resolvedRelation,
  } = wsResult;
  role = resolvedRelation;

  if (currentWorkspaceId !== undefined) {
    findManyInput.workspaceId = currentWorkspaceId;
    // Include projects with NULL workspaceId when viewing the default workspace.
    // These are pre-workspace projects that belong to the user but haven't been
    // assigned to a workspace yet.
    if (currentWorkspace?.isDefault) {
      findManyInput.includeUnassigned = true;
    }
  }

  // When the workspace owner's plan has been downgraded, non-owner members
  // must not see shared projects on reload. The owner keeps seeing their
  // own projects because they own them regardless of plan status.
  const projects = isDowngradedForMember(currentWorkspace)
    ? []
    : await dashboardProjectCaller(context).findMany(findManyInput);

  const templates = await dashboardDb.db.findManyByIds(
    env.PROJECT_TEMPLATES,
    context,
    { skipApprovalCheck: true }
  );

  const notifications = await notificationApi.list(context);

  return {
    context,
    user,
    origin: sourceOrigin,
    planFeatures,
    purchases,
    projects,
    templates,
    workspaces,
    currentWorkspaceId,
    role,
    notifications,
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
    planFeatures,
    purchases,
    origin,
    projects,
    templates,
    workspaces,
    currentWorkspaceId,
    role,
    notifications,
  } = await loadDashboardData(request);

  const projectToClone = await getProjectToClone(request, context);

  return {
    user,
    projects,
    templates,
    planFeatures,
    purchases,
    publisherHost: env.PUBLISHER_HOST,
    origin,
    projectToClone,
    workspaces,
    currentWorkspaceId,
    role,
    notifications,
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
  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (search !== "") {
      setSetting("lastDashboardSearch", search);
    } else {
      const lastSearch = getSetting("lastDashboardSearch");
      if (lastSearch !== "") {
        navigate({ search: lastSearch }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSetting("lastDashboardSearch", search);
  }, [search]);

  // `useLoaderData` wraps the return in `JsonifyObject` which turns
  // `string | undefined` properties into optional keys.  At runtime the
  // shapes are identical, so the cast to `DashboardData` is safe.
  const data = useLoaderData<typeof loader>() as ReturnType<
    typeof useLoaderData<typeof loader>
  > &
    DashboardData;

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
