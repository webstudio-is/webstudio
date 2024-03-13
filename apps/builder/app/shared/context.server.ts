import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";
import { entryApi } from "./entri/entri-api.server";
import {
  getTokenPlanFeatures,
  getUserPlanFeatures,
} from "./db/user-plan-features.server";
import { getAllApprovedProjectIds } from "./marketplace/db.server";

const createAuthorizationContext = async (
  request: Request
): Promise<AppContext["authorization"]> => {
  const url = new URL(request.url);

  const authToken = url.searchParams.get("authToken") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);
  const marketplaceProjectIds = await getAllApprovedProjectIds();

  const isServiceCall =
    request.headers.has("Authorization") &&
    request.headers.get("Authorization") === env.TRPC_SERVER_API_TOKEN;

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authToken,
    isServiceCall,
    marketplaceProjectIds,
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

const createUserPlanContext = async (
  request: Request,
  authorization: AppContext["authorization"]
) => {
  const url = new URL(request.url);

  const authToken = url.searchParams.get("authToken");
  // When a shared link is accessed, identified by the presence of an authToken,
  // the system retrieves the plan features associated with the project owner's account.
  if (authToken !== null) {
    const planFeatures = await getTokenPlanFeatures(authToken);
    return planFeatures;
  }

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
  const userPlanFeatures = await createUserPlanContext(request, authorization);
  return {
    authorization,
    domain,
    deployment,
    entri,
    userPlanFeatures,
  };
};
