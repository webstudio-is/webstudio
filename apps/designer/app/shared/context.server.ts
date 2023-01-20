import type {
  Context as SharedContext,
  AuthorizationContext,
} from "@webstudio-is/trpc-interface/server";
import { z } from "zod";
import * as cryptoJson from "./crypto/crypto-json.server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";

const ReadToken = z.object({
  projectId: z.string(),
});

export type Context = SharedContext;

export type ReadToken = z.infer<typeof ReadToken>;

const createAuthorizationContext = async (
  request: Request
): Promise<AuthorizationContext> => {
  const url = new URL(request.url);
  const readTokenRaw = url.searchParams.get("readToken") ?? undefined;
  const token = url.searchParams.get("token") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  let readToken: ReadToken | undefined;

  if (readTokenRaw !== undefined) {
    readToken = ReadToken.parse(
      await cryptoJson.decode(
        readTokenRaw,
        process.env.AUTH_SECRET ?? "NO-SECRET"
      )
    );
  }

  const context: AuthorizationContext = {
    userId: user?.id,
    readToken,
    token,
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

export const createReadToken = async (tokenData: ReadToken) => {
  return cryptoJson.encode(tokenData, process.env.AUTH_SECRET ?? "NO-SECRET");
};

export const createContext = async (request: Request): Promise<Context> => {
  const authorization = await createAuthorizationContext(request);

  return {
    authorization,
  };
};
