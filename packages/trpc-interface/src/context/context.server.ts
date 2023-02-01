import type { TrpcInterfaceClient } from "../shared/shared-router";

/**
 * All necessary parameters for Authorization
 */
type AuthorizationContext = {
  /**
   * Canvas generally resides on a different domain,
   * and we can't bridge a session with it because "Safari won't let us just do it.
   * So we generate an encrypted token allowing read access to the project inside the canvas.
   */
  authReadToken: { projectId: string } | undefined;

  /**
   * userId of the current authenticated user
   */
  userId: string | undefined;

  /**
   * token URLSearchParams or hostname
   */
  authToken: string | undefined;

  /**
   * buildEnv==="prod" only if we are loading project with production build
   */
  buildEnv: "dev" | "prod";

  // Pass trpcClient through context as only main app can initialize it
  authorizeTrpc: TrpcInterfaceClient["authorize"];
};

/**
 * AppContext is a global context that is passed to all trpc/api queries/mutations
 * "authorization" is made inside the namespace because eventually there will be
 * logging parameters, potentially "request" cache, etc.
 */
export type AppContext = {
  authorization: AuthorizationContext;
};
