import { type AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { trpcSharedClient } from "~/services/trpc.server";
import { entryApi } from "./entri/entri-api.server";

import { getUserPlanFeatures } from "./db/user-plan-features.server";
import { staticEnv } from "~/env/env.static.server";
import { createClient } from "@webstudio-is/postrest/index.server";
import { prisma } from "@webstudio-is/prisma-client";

const createAuthorizationContext = async (
  request: Request
): Promise<AppContext["authorization"]> => {
  const url = new URL(request.url);

  const authToken =
    url.searchParams.get("authToken") ??
    request.headers.get("x-auth-token") ??
    undefined;

  const user = await authenticator.isAuthenticated(request);

  const isServiceCall =
    request.headers.has("Authorization") &&
    request.headers.get("Authorization") === env.TRPC_SERVER_API_TOKEN;

  let ownerId = user?.id;

  if (authToken != null) {
    const projectOwnerIdByToken = await prisma.authorizationToken.findUnique({
      where: {
        token: authToken,
      },
      select: {
        project: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (projectOwnerIdByToken === null) {
      throw new Error(`Project owner can't be found for token ${authToken}`);
    }

    const projectOwnerId = projectOwnerIdByToken.project.userId;
    if (projectOwnerId === null) {
      throw new Error(
        `Project ${projectOwnerIdByToken.project.id} has null userId`
      );
    }
    ownerId = projectOwnerId;
  }

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authToken,
    isServiceCall,
    ownerId,
  };

  return context;
};

const createDomainContext = (_request: Request) => {
  const context: AppContext["domain"] = {
    domainTrpc: trpcSharedClient.domain,
  };

  return context;
};

const getRequestOrigin = (request: Request) => {
  const url = new URL(request.url);

  // vercel overwrites x-forwarded-host on edge level even if our header is set
  // as workaround we use custom header x-forwarded-ws-host to get the original host
  url.host =
    request.headers.get("x-forwarded-ws-host") ??
    request.headers.get("x-forwarded-host") ??
    url.host;
  return url.origin;
};

const createDeploymentContext = (request: Request) => {
  const context: AppContext["deployment"] = {
    deploymentTrpc: trpcSharedClient.deployment,
    env: {
      BUILDER_ORIGIN: `${getRequestOrigin(request)}`,
      GITHUB_REF_NAME: staticEnv.GITHUB_REF_NAME ?? "undefined",
      GITHUB_SHA: staticEnv.GITHUB_SHA ?? undefined,
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
  authorization: AppContext["authorization"]
) => {
  const planFeatures = authorization.ownerId
    ? await getUserPlanFeatures(authorization.ownerId)
    : undefined;
  return planFeatures;
};

const createTrpcCache = () => {
  const proceduresMaxAge = new Map<string, number>();
  const setMaxAge = (path: string, value: number) => {
    proceduresMaxAge.set(
      path,
      Math.min(proceduresMaxAge.get(path) ?? Number.MAX_SAFE_INTEGER, value)
    );
  };

  const getMaxAge = (path: string) => proceduresMaxAge.get(path);

  return {
    setMaxAge,
    getMaxAge,
  };
};

const createPostrestContext = () => {
  return { client: createClient(env.POSTGREST_URL, env.POSTGREST_API_KEY) };
};

/**
 * argument buildEnv==="prod" only if we are loading project with production build
 */
export const createContext = async (request: Request): Promise<AppContext> => {
  const authorization = await createAuthorizationContext(request);

  const domain = createDomainContext(request);
  const deployment = createDeploymentContext(request);
  const entri = createEntriContext();
  const userPlanFeatures = await createUserPlanContext(authorization);
  const trpcCache = createTrpcCache();
  const postgrest = createPostrestContext();

  return {
    authorization,
    domain,
    deployment,
    entri,
    userPlanFeatures,
    trpcCache,
    postgrest,
  };
};
