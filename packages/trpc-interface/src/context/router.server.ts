import { initTRPC } from "@trpc/server";
import type { AppContext } from "./context.server";

export const { router, procedure, middleware, mergeRouters } = initTRPC
  .context<AppContext>()
  .create();
