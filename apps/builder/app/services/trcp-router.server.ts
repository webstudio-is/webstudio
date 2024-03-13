import { router } from "@webstudio-is/trpc-interface/index.server";
import { marketplaceRouter } from "../shared/marketplace/router.server";
import { domainRouter } from "@webstudio-is/domain/index.server";

export const appRouter = router({
  marketplace: marketplaceRouter,
  domain: domainRouter,
});

export type AppRouter = typeof appRouter;
