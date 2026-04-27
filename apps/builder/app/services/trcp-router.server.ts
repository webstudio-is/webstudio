import { router } from "@webstudio-is/trpc-interface/index.server";
import { domainRouter } from "@webstudio-is/domain/index.server";
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

export const appRouter = router({
  build: buildRouter,
  user: userRouter,
  marketplace: marketplaceRouter,
  domain: domainRouter,
  project: projectRouter,
  workspace: workspaceRouter,
  notification: notificationRouter,
  authorizationToken: authorizationTokenRouter,
  dashboardProject: dashboardProjectRouter,
  logout: logoutRouter,
  polly: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
