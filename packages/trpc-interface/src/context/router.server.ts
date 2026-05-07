import { initTRPC } from "@trpc/server";
import type { AppContext } from "./context.server";
import {
  createApiCompatibilityPayload,
  getApiCompatibilityPayload,
} from "../api-compatibility";

export const {
  router,
  procedure,
  middleware,
  mergeRouters,
  createCallerFactory,
} = initTRPC.context<AppContext>().create({
  errorFormatter({ shape, error, ctx }) {
    const target = ctx?.apiClient.type;
    const payload =
      getApiCompatibilityPayload(error.cause) ??
      (error.code === "NOT_FOUND" && (target === "browser" || target === "cli")
        ? createApiCompatibilityPayload({
            reason: "apiProcedureNotFound",
            target,
          })
        : undefined);

    if (payload === undefined) {
      return shape;
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        apiCompatibility: payload,
      },
    };
  },
});

export const createCacheMiddleware = (seconds: number) =>
  middleware(async ({ path, ctx, next }) => {
    // tRPC batches multiple requests into a single network call.
    // The `path` is used as key to find the least max age among all paths for caching
    ctx.trpcCache.setMaxAge(path, seconds);

    return next({ ctx });
  });
