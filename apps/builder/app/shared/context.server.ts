import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";

const createAuthorizationContext = async (
  request: Request,
  buildEnv: AppContext["authorization"]["buildEnv"]
): Promise<AppContext["authorization"]> => {
  const url = new URL(request.url);

  const authToken = url.searchParams.get("authToken") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authToken,
    buildEnv,
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

/**
 * argument buildEnv==="prod" only if we are loading project with production build
 */
export const createContext = async (
  request: Request,
  buildEnv: AppContext["authorization"]["buildEnv"] = "dev"
): Promise<AppContext> => {
  const authorization = await createAuthorizationContext(request, buildEnv);

  return {
    authorization,
  };
};
