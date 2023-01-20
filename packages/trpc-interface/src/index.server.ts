export type { SharedRouter } from "./shared/shared-router";
export { createTrpcProxyServiceClient } from "./shared/client";

export type { AuthorizationContext, Context } from "./context/context.server";
export * as authorizeProject from "./authorize/project.server";
