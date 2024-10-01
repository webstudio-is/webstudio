import { type AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { trpcSharedClient } from "~/services/trpc.server";
import { entryApi } from "./entri/entri-api.server";

import { getUserPlanFeatures } from "./db/user-plan-features.server";
import { staticEnv } from "~/env/env.static.server";
import { createClient } from "@webstudio-is/postrest/index.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { readLoginSessionBloomFilter } from "~/services/session.server";
import type { BloomFilter } from "~/services/bloom-filter.server";
import { isBuilder, isCanvas } from "./router-utils";
import { parseBuilderUrl } from "@webstudio-is/http-client";

export const extractAuthFromRequest = async (request: Request) => {
  if (isCanvas(request)) {
    throw new Error("Canvas requests can't have authorization context");
  }
  const url = new URL(request.url);

  const authToken =
    url.searchParams.get("authToken") ??
    request.headers.get("x-auth-token") ??
    undefined;

  const sessionData = isBuilder(request)
    ? await builderAuthenticator.isAuthenticated(request)
    : await authenticator.isAuthenticated(request);

  const isServiceCall =
    request.headers.has("Authorization") &&
    request.headers.get("Authorization") === env.TRPC_SERVER_API_TOKEN;

  return {
    authToken,
    sessionData,
    isServiceCall,
  };
};

const createTokenAuthorizationContext = async (
  authToken: string,
  postgrest: AppContext["postgrest"]
) => {
  const projectOwnerIdByToken = await postgrest.client
    .from("AuthorizationToken")
    .select("project:Project(id, userId)")
    .eq("token", authToken)
    .single();

  if (projectOwnerIdByToken.error) {
    throw new Error(`Project owner can't be found for token ${authToken}`);
  }

  const ownerId = projectOwnerIdByToken.data.project?.userId ?? null;
  if (ownerId === null) {
    throw new Error(
      `Project ${projectOwnerIdByToken.data.project?.id} has null userId`
    );
  }

  return {
    type: "token" as const,
    authToken,
    ownerId,
  };
};

const createAuthorizationContext = async (
  request: Request,
  postgrest: AppContext["postgrest"]
): Promise<AppContext["authorization"]> => {
  const { authToken, isServiceCall, sessionData } =
    await extractAuthFromRequest(request);

  if (isServiceCall) {
    return {
      type: "service",
      isServiceCall: true,
    };
  }

  if (authToken != null) {
    return await createTokenAuthorizationContext(authToken, postgrest);
  }

  if (sessionData?.userId != null) {
    const userId = sessionData.userId;

    let loginBloomFilter: BloomFilter | undefined = undefined;

    let isLoggedInToBuilder = async (projectId: string) => {
      if (loginBloomFilter === undefined) {
        loginBloomFilter = await readLoginSessionBloomFilter(request);
      }

      return loginBloomFilter.has(projectId);
    };

    if (isBuilder(request)) {
      isLoggedInToBuilder = async (projectId: string) => {
        const parsedUrl = parseBuilderUrl(request.url);
        return parsedUrl.projectId === projectId;
      };
    }

    return {
      type: "user",
      userId,
      sessionCreatedAt: sessionData.createdAt,
      isLoggedInToBuilder,
    };
  }

  return { type: "anonymous" };
};

const createDomainContext = () => {
  const context: AppContext["domain"] = {
    domainTrpc: trpcSharedClient.domain,
  };

  return context;
};

const getRequestOrigin = (urlStr: string) => {
  const url = new URL(urlStr);

  return url.origin;
};

const createDeploymentContext = (builderOrigin: string) => {
  const context: AppContext["deployment"] = {
    deploymentTrpc: trpcSharedClient.deployment,
    env: {
      BUILDER_ORIGIN: getRequestOrigin(builderOrigin),
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
  authorization: AppContext["authorization"],
  postgrest: AppContext["postgrest"]
) => {
  const ownerId =
    authorization.type === "token"
      ? authorization.ownerId
      : authorization.type === "user"
        ? authorization.userId
        : undefined;

  const planFeatures = ownerId
    ? await getUserPlanFeatures(ownerId, postgrest)
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

export const createPostrestContext = () => {
  return { client: createClient(env.POSTGREST_URL, env.POSTGREST_API_KEY) };
};

/**
 * argument buildEnv==="prod" only if we are loading project with production build
 */
export const createContext = async (request: Request): Promise<AppContext> => {
  const postgrest = createPostrestContext();
  const authorization = await createAuthorizationContext(request, postgrest);

  const domain = createDomainContext();
  const deployment = createDeploymentContext(getRequestOrigin(request.url));
  const entri = createEntriContext();
  const userPlanFeatures = await createUserPlanContext(
    authorization,
    postgrest
  );
  const trpcCache = createTrpcCache();

  const createTokenContext = async (authToken: string) => {
    const authorization = await createTokenAuthorizationContext(
      authToken,
      postgrest
    );
    const userPlanFeatures = await createUserPlanContext(
      authorization,
      postgrest
    );

    return {
      authorization,
      domain,
      deployment,
      entri,
      userPlanFeatures,
      trpcCache,
      postgrest,
      createTokenContext,
    };
  };

  return {
    authorization,
    domain,
    deployment,
    entri,
    userPlanFeatures,
    trpcCache,
    postgrest,
    createTokenContext,
  };
};
