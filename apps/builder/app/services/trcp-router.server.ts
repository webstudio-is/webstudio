import { router } from "@webstudio-is/trpc-interface/index.server";
import { domainRouter } from "@webstudio-is/domain/index.server";
import { projectRouter } from "@webstudio-is/project/index.server";
import { authorizationTokenRouter } from "@webstudio-is/authorization-token/index.server";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import { marketplaceRouter } from "../shared/marketplace/router.server";
import { logoutRouter } from "./logout-router.server";

export const appRouter = router({
  marketplace: marketplaceRouter,
  domain: domainRouter,
  project: projectRouter,
  authorizationToken: authorizationTokenRouter,
  dashboardProject: dashboardProjectRouter,
  logout: logoutRouter,
});

export type AppRouter = typeof appRouter;
