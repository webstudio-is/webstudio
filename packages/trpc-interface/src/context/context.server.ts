import type { TrpcInterfaceClient } from "../shared/shared-router";

/**
 * All necessary parameters for Authorization
 */
type AuthorizationContext = {
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

type DomainContext = {
  domainTrpc: TrpcInterfaceClient["domain"];
};

type DeploymentContext = {
  deploymentTrpc: TrpcInterfaceClient["deployment"];
  env: {
    BUILDER_ORIGIN: string;
    BRANCH_NAME: string;
  };
};

/**
 * AppContext is a global context that is passed to all trpc/api queries/mutations
 * "authorization" is made inside the namespace because eventually there will be
 * logging parameters, potentially "request" cache, etc.
 */
export type AppContext = {
  authorization: AuthorizationContext;
  domain: DomainContext;
  deployment: DeploymentContext;
};
