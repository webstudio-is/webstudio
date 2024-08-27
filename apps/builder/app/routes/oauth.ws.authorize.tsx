import { json, redirect, type LoaderFunction } from "@remix-run/server-runtime";
import { z } from "zod";
import { createDebug } from "~/shared/debug";
import { fromError } from "zod-validation-error";
import { getAuthorizationServerOrigin } from "~/shared/router-utils/origins";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { returnToCookie } from "~/services/cookie.server";
import { createCodeToken } from "~/services/token.server";
import { isUserAuthorizedForProject } from "~/services/builder-access.server";

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
      getAuthorizationServerOrigin(redirect_uri)
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

    const user = await authenticator.isAuthenticated(request);

    if (user) {
      debug(`User id=${user.id} is authenticated`);

      const isAuthorized = await isUserAuthorizedForProject(
        user.id,
        oAuthParams.scope.projectId
      );

      // scope: Ensure the requested scope is valid, authorized, and within the permissions granted to the client.
      if (false === isAuthorized) {
        debug(
          `User ${user.id} is not the owner of ${oAuthParams.scope.projectId}, denying access`
        );
        return oauthError(
          "unauthorized_client",
          "User does not have access to the project"
        );
      }

      debug(
        `User ${user.id} is the owner of ${oAuthParams.scope.projectId}, creating token`
      );

      // We do not use database now.
      // https://datatracker.ietf.org/doc/html/rfc7636#section-4.4
      const code = await createCodeToken(
        {
          userId: user.id,
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

      return redirect(redirectUri.href);
    }

    user satisfies null;

    debug(
      "User is not authenticated, saving current url to returnTo cookie and redirecting to login"
    );

    const headers = new Headers();
    // Issue with local development, so force https
    const returnToUrl = new URL(request.url);
    returnToUrl.protocol = "https";

    // We don't want to have all params above in the URL, so save in returnTo cookie immediately
    headers.append(
      "Set-Cookie",
      await returnToCookie.serialize(returnToUrl.href)
    );

    return redirect("/login", { headers });
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
