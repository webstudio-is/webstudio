import { router } from "@webstudio-is/trpc-interface/index.server";
import { marketplaceRouter } from "../shared/marketplace/router.server";

export const appRouter = router({
  marketplace: marketplaceRouter,
});

export type AppRouter = typeof appRouter;
