import { router } from "@webstudio-is/trpc-interface/index.server";
import { createDomainRouter } from "@webstudio-is/domain/index.server";
import { projectRouter } from "@webstudio-is/project/index.server";
import { authorizationTokenRouter } from "@webstudio-is/authorization-token/index.server";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { marketplaceRouter } from "~/shared/marketplace/router.server";
import { subscriptionRouter } from "~/shared/polly/subscription-router.server";
import { userRouter } from "./user-router.server";
import { logoutRouter } from "./logout-router.server";
import { notificationRouter } from "./notification-router.server";
import { workspaceRouter } from "./workspace-router.server";
import { buildRouter } from "./build-router.server";
import { apiRouter } from "./api-router.server";
import { getContentDatabaseBuildFindings } from "./content-database-publish-findings.server";

export const appRouter = router({
  api: apiRouter,
  build: buildRouter,
  user: userRouter,
  marketplace: marketplaceRouter,
  domain: createDomainRouter(getContentDatabaseBuildFindings),
  project: projectRouter,
  workspace: workspaceRouter,
  notification: notificationRouter,
  authorizationToken: authorizationTokenRouter,
  dashboardProject: dashboardProjectRouter,
  logout: logoutRouter,
  polly: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
