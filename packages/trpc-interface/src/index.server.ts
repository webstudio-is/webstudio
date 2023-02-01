export type { SharedRouter } from "./shared/shared-router";
export { createTrpcProxyServiceClient } from "./shared/client";

export type { AppContext } from "./context/context.server";
export * as authorizeProject from "./authorize/project.server";
export * as authorizeAuthorizationToken from "./authorize/authorization-token.server";
