import { Authenticator, AuthorizationError } from "remix-auth";
import { builderSessionStorage } from "./builder-session.server";
import env from "~/env/env.server";

import {
  type OAuth2StrategyOptionsOverrides,
  WsStrategy,
} from "./auth-strategy/ws.server";
import {
  getAuthorizationServerOrigin,
  getRequestOrigin,
} from "~/shared/router-utils/origins";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { createDebug } from "~/shared/debug";
import { readAccessToken } from "./token.server";
import { isUserAuthorizedForProject } from "./builder-access.server";
import type { SessionData } from "./auth.server.utils";

const debug = createDebug(import.meta.url);

export const builderAuthenticator = new Authenticator<SessionData>(
  builderSessionStorage,
  {
    throwOnError: true,
  }
);

builderAuthenticator.use(
  new WsStrategy<SessionData>(
    {
      clientId: env.AUTH_WS_CLIENT_ID,
      clientSecret: env.AUTH_WS_CLIENT_SECRET,
      authorizationEndpoint: "https://OVERRIDDEN_ENDPOINT/oauth2/authorize",
      tokenEndpoint: "https://OVERRIDDEN_ENDPOINT/oauth2/token",
      redirectURI: "https://OVERRIDDEN_ENDPOINT/auth/callback",
      codeChallengeMethod: "S256",
      // use http_basic_auth to bypass no-cross-origin-cookie.ts/preventCrossOriginCookie
      authenticateWith: "http_basic_auth",
    },
    async ({ tokens, request }) => {
      const accessToken = await readAccessToken(
        tokens.access_token,
        env.AUTH_WS_CLIENT_SECRET
      );

      if (accessToken === undefined) {
        debug("Invalid or expired access token", tokens.access_token);

        throw new AuthorizationError("Invalid or expired access token");
      }

      const { projectId } = parseBuilderUrl(request.url);

      if (accessToken.projectId !== projectId) {
        throw new AuthorizationError(
          "Token projectId and request projectId do not match"
        );
      }

      const isAuthorized = await isUserAuthorizedForProject(
        accessToken.userId,
        projectId
      );

      // We don't need this check because the token is already verified, anyway let's keep it for now
      if (false === isAuthorized) {
        throw new AuthorizationError(
          "User does not have access to this project"
        );
      }

      debug("User authenticated", accessToken.userId);

      return await { userId: accessToken.userId, createdAt: Date.now() };
    },
    (request: Request): OAuth2StrategyOptionsOverrides => {
      const origin = getRequestOrigin(request.url);
      const authOrigin = getAuthorizationServerOrigin(request.url);
      const { projectId } = parseBuilderUrl(request.url);

      if (origin === authOrigin) {
        throw new Error("Origin and authOrigin cannot be same");
      }

      return {
        authorizationEndpoint: `${authOrigin}/oauth/ws/authorize`,
        tokenEndpoint: `${authOrigin}/oauth/ws/token`,
        redirectURI: `${origin}/auth/ws/callback`,
        scopes: [`project:${projectId}`],
      };
    }
  ),
  "ws"
);
