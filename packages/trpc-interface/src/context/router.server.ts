import { initTRPC } from "@trpc/server";
import type { AppContext } from "./context.server";
import {
  createApiCompatibilityPayload,
  getApiCompatibilityPayload,
} from "../api-compatibility";

const getWebstudioErrorCode = (cause: unknown) => {
  if (typeof cause !== "object" || cause === null) {
    return;
  }
  const code = (cause as { webstudioCode?: unknown }).webstudioCode;
  return typeof code === "string" ? code : undefined;
};

const getValidationIssues = (cause: unknown) => {
  if (typeof cause !== "object" || cause === null) {
    return;
  }
  const issues = (cause as { issues?: unknown }).issues;
  return Array.isArray(issues) ? issues : undefined;
};

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
    const webstudioCode = getWebstudioErrorCode(error.cause);
    const issues = getValidationIssues(error.cause);

    if (
      payload === undefined &&
      webstudioCode === undefined &&
      issues === undefined
    ) {
      return shape;
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        ...(payload === undefined ? {} : { apiCompatibility: payload }),
        ...(webstudioCode === undefined ? {} : { webstudioCode }),
        ...(issues === undefined ? {} : { issues }),
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
