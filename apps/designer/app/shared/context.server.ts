import type { AppContext } from "@webstudio-is/trpc-interface/server";
import { z } from "zod";
import * as cryptoJson from "./crypto/crypto-json.server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";
import env from "~/env/env.server";

const AuthReadToken = z.object({
  projectId: z.string(),
});

type AuthReadToken = z.infer<typeof AuthReadToken>;

const createAuthorizationContext = async (
  request: Request,
  buildEnv: AppContext["authorization"]["buildEnv"]
): Promise<AppContext["authorization"]> => {
  const url = new URL(request.url);

  const authReadTokenRaw = url.searchParams.get("authReadToken") ?? undefined;
  const authToken = url.searchParams.get("authToken") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  let authReadToken: AuthReadToken | undefined;

  if (authReadTokenRaw !== undefined) {
    authReadToken = AuthReadToken.parse(
      await cryptoJson.decode(authReadTokenRaw, env.AUTH_SECRET ?? "NO-SECRET")
    );
  }

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authReadToken,
    authToken,
    buildEnv,
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

export const createAuthReadToken = async (tokenData: AuthReadToken) => {
  return cryptoJson.encode(tokenData, env.AUTH_SECRET ?? "NO-SECRET");
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
