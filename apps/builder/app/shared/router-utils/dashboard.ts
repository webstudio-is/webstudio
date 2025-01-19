import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { db } from "@webstudio-is/project/index.server";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { findAuthenticatedUser } from "~/services/auth.server";
import { createContext } from "~/shared/context.server";
export { ErrorBoundary } from "~/shared/error/error-boundary";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";
import { loginPath } from "./path-utils";
import { isDashboard } from "./is-canvas";

export const loadDashboardData = async (request: Request) => {
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

  const { userPlanFeatures } = context;

  if (userPlanFeatures === undefined) {
    throw new Response("User plan features are not defined", {
      status: 404,
    });
  }

  const { sourceOrigin } = parseBuilderUrl(request.url);

  return { context, user, origin: sourceOrigin, userPlanFeatures };
};

export const getProjectToClone = async (
  request: Request,
  context: AppContext
) => {
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
