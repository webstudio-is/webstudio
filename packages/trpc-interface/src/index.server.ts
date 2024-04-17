export type { SharedRouter } from "./shared/shared-router";
export { createTrpcProxyServiceClient } from "./shared/client";

export type { AppContext } from "./context/context.server";

export { AuthorizationError } from "./context/errors.server";
export * as authorizeProject from "./authorize/project.server";
export * as authorizeAuthorizationToken from "./authorize/authorization-token.server";
export type { AuthPermit } from "./shared/authorization-router";
export {
  router,
  procedure,
  middleware,
  mergeRouters,
  createCacheMiddleware,
} from "./context/router.server";
