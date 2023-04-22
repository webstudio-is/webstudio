import { initTRPC } from "@trpc/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";

export const { router, procedure, middleware, mergeRouters } = initTRPC
  .context<AppContext>()
  .create();
