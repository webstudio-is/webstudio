import { json, type LoaderFunction } from "@remix-run/server-runtime";
import { z } from "zod";
import { createDebug } from "~/shared/debug";
import { fromError } from "zod-validation-error";
import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "~/shared/router-utils/origins";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { createCodeToken } from "~/services/token.server";
import { isUserAuthorizedForProject } from "~/services/builder-access.server";
import {
  builderUrl,
  compareUrls,
  isDashboard,
  loginPath,
} from "~/shared/router-utils";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import * as session from "~/services/session.server";
import { redirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";

const debug = createDebug(import.meta.url);

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
const createOauthError =
  (redirectUri: string, state: string) =>
  (
    error: "invalid_request" | "invalid_scope" | "unauthorized_client",
    errorDescription: string
  ) => {
    const url = new URL(redirectUri);
    url.search = "";

    url.searchParams.set("error", error);
    url.searchParams.set("error_description", errorDescription);
    if (state) {
      url.searchParams.set("state", state);
    }

    return redirect(url.href, { status: 302 });
  };

/**
 * OAuth 2.0 Authorization Request
 *
 * https://datatracker.ietf.org/doc/html/rfc7636#section-4.3
 *
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
 */
const OAuthParams = z.object({
  // Ensure that the response_type is valid and supported by the authorization server (e.g., code for the authorization code grant type).
  response_type: z.literal("code"),
  redirect_uri: z.string().url(),

  client_id: z.string(),
  state: z.string(),
  scope: z
    .string()
    .refine((str) => str.startsWith("project:"), {
      message: "Only 'project:' scopes are allowed",
    })
    .transform((scope) => ({
      projectId: scope.split(":")[1],
    })),
  code_challenge: z.string(),
  code_challenge_method: z.literal("S256"),
});

const OAuthRedirectUri = z.object({
  redirect_uri: z.string().url(),
});

/**
 * Based RFC 6749 and RFC 7636
 *
 * https://datatracker.ietf.org/doc/html/rfc6749
 *
 * https://datatracker.ietf.org/doc/html/rfc7636
 */
export const loader: LoaderFunction = async ({ request }) => {
  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document"]);
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.

  try {
    debug("Authorize request received", request.url);

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    const parsedRedirect = OAuthRedirectUri.safeParse(searchParams);

    if (false === parsedRedirect.success) {
      debug("redirect_uri not provided in query params");

      return json(
        {
          error: "invalid_request",
          error_description: "No redirect_uri provided",
          error_uri: "https://tools.ietf.org/html/rfc6749#section-3.1.2",
        },
        { status: 400 }
      );
    }

    // eslint-disable-next-line camelcase
    const { redirect_uri } = parsedRedirect.data;

    // Validate the redirect_uri
    // It is not pre-registered but it must match the AuthorizationServerOrigin
    if (
      getAuthorizationServerOrigin(request.url) !==
        getAuthorizationServerOrigin(redirect_uri) ||
      new URL(redirect_uri).pathname !== "/auth/ws/callback" ||
      false === isBuilderUrl(redirect_uri)
    ) {
      debug("redirect_uri does not match the registered redirect URIs");

      return json(
        {
          error: "invalid_request",
          error_description:
            "The redirect_uri provided does not match the registered redirect URIs.",
          error_uri: "https://tools.ietf.org/html/rfc6749#section-3.1.2",
        },
        { status: 400 }
      );
    }

    let oauthError = createOauthError(redirect_uri, searchParams.state);

    const parsedOAuthParams = OAuthParams.safeParse(searchParams);

    if (false === parsedOAuthParams.success) {
      debug(fromError(parsedOAuthParams.error).toString());

      return oauthError(
        "invalid_request",
        fromError(parsedOAuthParams.error).toString()
      );
    }

    // Reinit with parsed state
    oauthError = createOauthError(redirect_uri, parsedOAuthParams.data.state);

    // client_id: Verify that the client_id is valid and corresponds to a registered client.
    if (parsedOAuthParams.data.client_id !== env.AUTH_WS_CLIENT_ID) {
      debug("Client is not registered");

      return oauthError("unauthorized_client", "Client is not registered");
    }

    const oAuthParams = parsedOAuthParams.data;

    const sessionData = await authenticator.isAuthenticated(request);

    if (sessionData) {
      debug(`User id=${sessionData.userId} is authenticated`);

      const isAuthorized = await isUserAuthorizedForProject(
        sessionData.userId,
        oAuthParams.scope.projectId
      );

      // scope: Ensure the requested scope is valid, authorized, and within the permissions granted to the client.
      if (false === isAuthorized) {
        debug(
          `User ${sessionData.userId} is not the owner of ${oAuthParams.scope.projectId}, denying access`
        );
        return oauthError(
          "unauthorized_client",
          "User does not have access to the project"
        );
      }

      // redirect_uri: Ensure the redirect_uri parameter value is valid and authorized
      if (
        false ===
        compareUrls(
          new URL(redirect_uri).origin,
          builderUrl({
            projectId: oAuthParams.scope.projectId,
            origin: getAuthorizationServerOrigin(request.url),
          })
        )
      ) {
        debug("redirect_uri does not match the registered redirect URIs");

        return json(
          {
            error: "invalid_request",
            error_description:
              "The redirect_uri provided does not match the registered redirect URIs.",
            error_uri: "https://tools.ietf.org/html/rfc6749#section-3.1.2",
          },
          { status: 400 }
        );
      }

      debug(
        `User ${sessionData.userId} is the owner of ${oAuthParams.scope.projectId}, creating token`
      );

      // We do not use database now.
      // https://datatracker.ietf.org/doc/html/rfc7636#section-4.4
      const code = await createCodeToken(
        {
          userId: sessionData.userId,
          projectId: oAuthParams.scope.projectId,
          codeChallenge: oAuthParams.code_challenge,
        },
        env.AUTH_WS_CLIENT_SECRET,
        { maxAge: 1000 * 60 * 5 }
      );

      const redirectUri = new URL(oAuthParams.redirect_uri);
      redirectUri.search = "";

      redirectUri.searchParams.set("code", code);
      // state: If present, store the state parameter to return it unchanged in the response
      redirectUri.searchParams.set("state", oAuthParams.state);

      debug(
        `Code ${code} created, redirecting to redirect_uri: ${redirectUri.href}`
      );

      const bloomFilter = await session.readLoginSessionBloomFilter(request);

      bloomFilter.add(oAuthParams.scope.projectId);

      return session.writeLoginSessionBloomFilter(
        request,
        redirect(redirectUri.href),
        bloomFilter
      );
    }

    sessionData satisfies null;

    debug(
      "User is not authenticated, saving current url to returnTo cookie and redirecting to login"
    );

    return redirect(loginPath({ returnTo: request.url }));
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("error", error);
    debug("error", error);

    throw json(
      {
        error: "server_error",
        error_description:
          error instanceof Error ? error.message : "Unknown error",
        error_uri: "",
      },
      { status: 500 }
    );
  }
};
