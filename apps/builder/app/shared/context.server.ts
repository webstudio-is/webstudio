import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";
import { entryApi } from "./entri/entri-api.server";
import { getUserPlanFeatures } from "./db/user-plan-features.server";

const createAuthorizationContext = async (
  request: Request
): Promise<AppContext["authorization"]> => {
  const url = new URL(request.url);

  const authToken = url.searchParams.get("authToken") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  const isServiceCall =
    request.headers.has("Authorization") &&
    request.headers.get("Authorization") === env.TRPC_SERVER_API_TOKEN;

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authToken,
    isServiceCall,
    projectTemplates: env.PROJECT_TEMPLATES,
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

const createDomainContext = (request: Request) => {
  const context: AppContext["domain"] = {
    domainTrpc: trpcClient.domain,
  };

  return context;
};

const createDeploymentContext = (request: Request) => {
  const url = new URL(request.url);

  const context: AppContext["deployment"] = {
    deploymentTrpc: trpcClient.deployment,
    env: {
      BUILDER_ORIGIN: url.origin,
      BRANCH_NAME: env.BRANCH_NAME ?? "main",
    },
  };

  return context;
};

const createEntriContext = () => {
  return {
    entryApi,
  };
};

const createUserPlanContext = async (request: Request) => {
  const user = await authenticator.isAuthenticated(request);
  const planFeatures = user?.id ? getUserPlanFeatures(user.id) : undefined;
  return planFeatures;
};

/**
 * argument buildEnv==="prod" only if we are loading project with production build
 */
export const createContext = async (request: Request): Promise<AppContext> => {
  const authorization = await createAuthorizationContext(request);
  const domain = createDomainContext(request);
  const deployment = createDeploymentContext(request);
  const entri = createEntriContext();
  const userPlanFeatures = await createUserPlanContext(request);
  return {
    authorization,
    domain,
    deployment,
    entri,
    userPlanFeatures,
  };
};
