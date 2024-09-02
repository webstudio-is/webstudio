import { initTRPC } from "@trpc/server";
import type { AppContext } from "./context.server";

export const {
  router,
  procedure,
  middleware,
  mergeRouters,
  createCallerFactory,
} = initTRPC.context<AppContext>().create();

export const createCacheMiddleware = (seconds: number) =>
  middleware(async ({ path, ctx, next }) => {
    // tRPC batches multiple requests into a single network call.
    // The `path` is used as key to find the least max age among all paths for caching
    ctx.trpcCache.setMaxAge(path, seconds);

    return next({ ctx });
  });
