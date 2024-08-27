import { type ActionFunctionArgs, json } from "@remix-run/server-runtime";
import { z } from "zod";

import { createDebug } from "~/shared/debug";
import { fromError } from "zod-validation-error";
import env from "~/env/env.server";
import {
  createAccessToken,
  readAccessToken,
  readCodeToken,
  verifyChallenge,
} from "~/services/token.server";
import { isUserAuthorizedForProject } from "~/services/builder-access.server";

/**
 * OAuth 2.0 Token Request
 *
 * https://datatracker.ietf.org/doc/html/rfc7636#section-4.5
 *
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
const TokenRequest = z.object({
  // Check that the grant_type parameter is present and is one of the supported values
  grant_type: z.literal("authorization_code"),
  code: z.string(),
  redirect_uri: z.string().url(),
  code_verifier: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
});

const debug = createDebug(import.meta.url);

/**
 * OAuth 2.0 Token Request
 *
 * https://datatracker.ietf.org/doc/html/rfc7636
 *
 * https://datatracker.ietf.org/doc/html/rfc6749
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  debug("Token request received");
  const jsonBody = Object.fromEntries((await request.formData()).entries());
  debug("Token request received", jsonBody);

  const parsedBody = TokenRequest.safeParse(jsonBody);

  if (false === parsedBody.success) {
    debug(fromError(parsedBody.error).toString());

    return json(
      {
        error: "invalid_request",
        error_description: fromError(parsedBody.error).toString(),
        error_uri: "https://tools.ietf.org/html/rfc6749#section-5.2",
      },
      { status: 400 }
    );
  }

  const body = parsedBody.data;

  // Validate the client’s credentials (e.g., client_id and client_secret) using HTTP Basic Authentication or form-encoded parameters.
  if (
    body.client_id !== env.AUTH_WS_CLIENT_ID ||
    body.client_secret !== env.AUTH_WS_CLIENT_SECRET
  ) {
    debug("client_id and client_secret do not match", body.code);
    return json(
      {
        error: "invalid_client",
        error_description: "invalid client credentials",
        error_uri: "https://tools.ietf.org/html/rfc6749#section-5.2",
      },
      { status: 401 }
    );
  }

  // Ensure the code parameter is present and valid.
  const codeToken = await readCodeToken(body.code, env.AUTH_WS_CLIENT_SECRET);

  if (codeToken === undefined) {
    debug("Code can not be read", body.code);
    return json(
      {
        error: "invalid_grant",
        error_description: "invalid code",
        error_uri: "https://tools.ietf.org/html/rfc6749#section-5.2",
      },
      { status: 400 }
    );
  }

  // verify the code_verifier against the stored code_challenge
  const isChallengeVerified = await verifyChallenge(
    body.code_verifier,
    codeToken.codeChallenge
  );
  if (false === isChallengeVerified) {
    debug(
      "Code verifier does not match",
      body.code_verifier,
      codeToken.codeChallenge
    );
    return json(
      {
        error: "invalid_grant",
        error_description: "invalid code_verifier",
        error_uri: "https://tools.ietf.org/html/rfc6749#section-5.2",
      },
      { status: 400 }
    );
  }

  const { projectId, userId } = codeToken;

  const isAuthorized = await isUserAuthorizedForProject(userId, projectId);

  if (false === isAuthorized) {
    debug("User does not have access to the project", userId, projectId);
    return json(
      {
        error: "invalid_grant",
        error_description: "user does not have access to the project",
        error_uri: "https://tools.ietf.org/html/rfc6749#section-5.2",
      },
      { status: 400 }
    );
  }

  const maxAge = 1000 * 60;

  // Generate a short-lived token, as its sole purpose is to log the user in.
  const accessToken = await createAccessToken(
    { userId, projectId },
    env.AUTH_WS_CLIENT_SECRET,
    {
      maxAge,
    }
  );

  debug("Token created", accessToken);

  debug(
    "readAccessToken",
    await readAccessToken(accessToken, env.AUTH_WS_CLIENT_SECRET)
  );

  return json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: Date.now() + maxAge,
    },
    { status: 200 }
  );
};
